import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { setColorScheme, ColorScheme, useTheme } from "@/src/theme";
import { storage } from "@/src/utils/storage";

const MODE_KEY = "rapportini.themeMode";
type Mode = ColorScheme | "system";

type ThemeModeContextType = {
  mode: Mode;
  setMode: (m: Mode) => void;
  scheme: ColorScheme;
};

const ThemeModeContext = createContext<ThemeModeContextType | undefined>(undefined);

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>("system");
  const { scheme } = useTheme();

  useEffect(() => {
    (async () => {
      const saved = await storage.getItem<Mode>(MODE_KEY, "system");
      const m = (saved ?? "system") as Mode;
      setModeState(m);
      setColorScheme(m === "system" ? null : m);
    })();
  }, []);

  const setMode = useCallback((m: Mode) => {
    setModeState(m);
    setColorScheme(m === "system" ? null : m);
    storage.setItem(MODE_KEY, m);
  }, []);

  return (
    <ThemeModeContext.Provider value={{ mode, setMode, scheme }}>
      {children}
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode(): ThemeModeContextType {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) throw new Error("useThemeMode must be used within ThemeModeProvider");
  return ctx;
}
