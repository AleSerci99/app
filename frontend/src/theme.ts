// Design tokens for Rapportini. Light + Dark themes.
// Keys match the "color" block of /app/design_guidelines.json.
// Use makeStyles() for stylesheets and useTheme().colors for color props.
// Never write color literals in components (except brand-fixed colors).

import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  surface: "#F9FAFB",
  onSurface: "#111827",
  surfaceSecondary: "#FFFFFF",
  onSurfaceSecondary: "#111827",
  surfaceTertiary: "#F3F4F6",
  onSurfaceTertiary: "#374151",
  surfaceInverse: "#1F2937",
  onSurfaceInverse: "#F9FAFB",
  muted: "#6B7280",

  brand: "#0369A1",
  onBrand: "#FFFFFF",
  brandPrimary: "#0284C7",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#16A34A",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "#EAB308",
  onBrandTertiary: "#111827",

  success: "#16A34A",
  onSuccess: "#FFFFFF",
  warning: "#EAB308",
  onWarning: "#111827",
  error: "#DC2626",
  onError: "#FFFFFF",
  info: "#0284C7",
  onInfo: "#FFFFFF",

  border: "#E5E7EB",
  borderStrong: "#D1D5DB",
  divider: "#F3F4F6",
};

const dark: typeof light = {
  surface: "#0F172A",
  onSurface: "#F8FAFC",
  surfaceSecondary: "#1E293B",
  onSurfaceSecondary: "#F8FAFC",
  surfaceTertiary: "#334155",
  onSurfaceTertiary: "#CBD5E1",
  surfaceInverse: "#F8FAFC",
  onSurfaceInverse: "#0F172A",
  muted: "#94A3B8",

  brand: "#38BDF8",
  onBrand: "#0F172A",
  brandPrimary: "#0284C7",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#22C55E",
  onBrandSecondary: "#0F172A",
  brandTertiary: "#FACC15",
  onBrandTertiary: "#0F172A",

  success: "#22C55E",
  onSuccess: "#0F172A",
  warning: "#FACC15",
  onWarning: "#0F172A",
  error: "#EF4444",
  onError: "#FFFFFF",
  info: "#38BDF8",
  onInfo: "#0F172A",

  border: "#334155",
  borderStrong: "#475569",
  divider: "#1E293B",
};

export type ThemeColors = typeof light;

export const defaultScheme = "light" satisfies ColorScheme;

export const themes: { light: ThemeColors; dark?: ThemeColors } = { light, dark };

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme);
}

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system && themes[system] ? system : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}
