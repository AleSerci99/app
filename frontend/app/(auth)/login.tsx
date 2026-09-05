import { useState } from "react";
import { Text, View, Pressable } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppButton, AppInput } from "@/src/components/ui";
import { useAuth } from "@/src/context/auth";
import { useToast } from "@/src/components/toast";
import { makeStyles, useTheme } from "@/src/theme";
import { Icon } from "@/src/components/icon";

const HERO = "https://images.unsplash.com/photo-1542621334-a254cf47733d?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80";

export default function LoginScreen() {
  const styles = useStyles();
  const { colors, scheme } = useTheme();
  const router = useRouter();
  const { login } = useAuth();
  const toast = useToast();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    if (!email.trim() || !password) {
      toast("Inserisci email e password", "error");
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      toast("Accesso effettuato", "success");
    } catch (e: any) {
      toast(e?.message ?? "Accesso non riuscito", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <Image source={{ uri: HERO }} style={styles.heroImg} contentFit="cover" />
        <LinearGradient
          colors={["transparent", scheme === "dark" ? "#0F172A" : "#0369A1"]}
          style={styles.scrim}
        />
        <View style={[styles.heroContent, { paddingTop: insets.top + 24 }]}>
          <View style={styles.logoRow}>
            <View style={styles.logoBox}>
              <Icon name="clipboard" size={22} color={colors.onBrandPrimary} />
            </View>
            <Text style={styles.brand}>Rapportini</Text>
          </View>
          <Text style={styles.tagline}>Gestisci le ore di lavoro dei tuoi cantieri</Text>
        </View>
      </View>

      <KeyboardAwareScrollView
        style={styles.formScroll}
        contentContainerStyle={styles.formContent}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Accedi</Text>
        <Text style={styles.subtitle}>Entra con le tue credenziali</Text>

        <View style={{ gap: 14, marginTop: 20 }}>
          <AppInput
            label="Email"
            icon="mail"
            placeholder="nome@azienda.it"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            testID="login-email-input"
          />
          <AppInput
            label="Password"
            icon="lock"
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            testID="login-password-input"
          />
        </View>

        <AppButton
          label="Accedi"
          onPress={onLogin}
          loading={loading}
          testID="login-submit-button"
          style={{ marginTop: 24 }}
        />

        <Pressable
          onPress={() => router.push("/(auth)/register")}
          style={styles.registerRow}
          testID="go-to-register-button"
        >
          <Text style={styles.registerText}>Non hai un account? </Text>
          <Text style={styles.registerLink}>Registrati</Text>
        </Pressable>
      </KeyboardAwareScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  hero: { height: 260, backgroundColor: colors.brand },
  heroImg: { width: "100%", height: "100%", opacity: 0.5 },
  scrim: { ...StyleSheetAbsolute() },
  heroContent: { position: "absolute", left: 20, right: 20, top: 0 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center",
  },
  brand: { fontSize: 26, fontWeight: "900", color: "#FFFFFF" },
  tagline: { color: "#FFFFFF", fontSize: 15, marginTop: 12, opacity: 0.95, width: "85%" },
  formScroll: { flex: 1 },
  formContent: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 28, fontWeight: "900", color: colors.onSurface },
  subtitle: { fontSize: 15, color: colors.muted, marginTop: 4 },
  registerRow: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  registerText: { color: colors.muted, fontSize: 15 },
  registerLink: { color: colors.brandPrimary, fontSize: 15, fontWeight: "800" },
}));

function StyleSheetAbsolute() {
  return { position: "absolute" as const, left: 0, right: 0, top: 0, bottom: 0 };
}
