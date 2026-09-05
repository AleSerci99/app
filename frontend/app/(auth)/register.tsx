import { useState } from "react";
import { Text, View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { AppButton, AppInput, Header } from "@/src/components/ui";
import { useAuth } from "@/src/context/auth";
import { useToast } from "@/src/components/toast";
import { makeStyles, useTheme } from "@/src/theme";
import { Icon } from "@/src/components/icon";

export default function RegisterScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { register } = useAuth();
  const toast = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const onRegister = async () => {
    if (name.trim().length < 2 || !email.trim() || password.length < 6) {
      toast("Compila tutti i campi (password min. 6 caratteri)", "error");
      return;
    }
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
      setDone(true);
    } catch (e: any) {
      toast(e?.message ?? "Registrazione non riuscita", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <Header title="Registrati" onBack={() => router.back()} />
      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
      >
        {done ? (
          <View style={styles.doneWrap} testID="register-success">
            <View style={styles.doneIcon}>
              <Icon name="clock" size={36} color={colors.warning} />
            </View>
            <Text style={styles.doneTitle}>Account in attesa</Text>
            <Text style={styles.doneMsg}>
              La tua registrazione è stata inviata. Un amministratore deve approvare
              il tuo account prima che tu possa accedere.
            </Text>
            <AppButton
              label="Torna al login"
              onPress={() => router.replace("/(auth)/login")}
              testID="back-to-login-button"
              style={{ marginTop: 20, alignSelf: "stretch" }}
            />
          </View>
        ) : (
          <>
            <Text style={styles.subtitle}>Crea il tuo account dipendente</Text>
            <View style={{ gap: 14, marginTop: 16 }}>
              <AppInput
                label="Nome e cognome"
                icon="user"
                placeholder="Mario Rossi"
                value={name}
                onChangeText={setName}
                testID="register-name-input"
              />
              <AppInput
                label="Email"
                icon="mail"
                placeholder="nome@azienda.it"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                testID="register-email-input"
              />
              <AppInput
                label="Password"
                icon="lock"
                placeholder="min. 6 caratteri"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                testID="register-password-input"
              />
            </View>
            <AppButton
              label="Crea account"
              onPress={onRegister}
              loading={loading}
              testID="register-submit-button"
              style={{ marginTop: 24 }}
            />
            <Pressable onPress={() => router.back()} style={styles.loginRow} testID="go-to-login-button">
              <Text style={styles.loginText}>Hai già un account? </Text>
              <Text style={styles.loginLink}>Accedi</Text>
            </Pressable>
          </>
        )}
      </KeyboardAwareScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 24, paddingBottom: 48 },
  subtitle: { fontSize: 15, color: colors.muted },
  loginRow: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  loginText: { color: colors.muted, fontSize: 15 },
  loginLink: { color: colors.brandPrimary, fontSize: 15, fontWeight: "800" },
  doneWrap: { alignItems: "center", paddingTop: 40, gap: 10 },
  doneIcon: {
    width: 84, height: 84, borderRadius: 999, backgroundColor: colors.surfaceTertiary,
    alignItems: "center", justifyContent: "center", marginBottom: 8,
  },
  doneTitle: { fontSize: 22, fontWeight: "900", color: colors.onSurface },
  doneMsg: { fontSize: 15, color: colors.muted, textAlign: "center", lineHeight: 22 },
}));
