import { useState } from "react";
import { ScrollView, Text, View, Pressable } from "react-native";
import { useRouter } from "expo-router";

import { Header, Card, AppButton, Badge } from "@/src/components/ui";
import { Icon } from "@/src/components/icon";
import { ConfirmDialog } from "@/src/components/confirm";
import { useAuth } from "@/src/context/auth";
import { useThemeMode } from "@/src/context/theme-mode";
import { makeStyles, useTheme } from "@/src/theme";

const MODES: { key: "system" | "light" | "dark"; label: string; icon: string }[] = [
  { key: "light", label: "Chiaro", icon: "sun" },
  { key: "dark", label: "Scuro", icon: "moon" },
  { key: "system", label: "Sistema", icon: "smartphone" },
];

export function ProfileScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { user, logout } = useAuth();
  const { mode, setMode } = useThemeMode();
  const router = useRouter();
  const [confirmLogout, setConfirmLogout] = useState(false);

  const initials = (user?.name ?? "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <View style={styles.root}>
      <Header title="Profilo" />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={{ marginTop: 10 }}>
            <Badge
              label={user?.role === "admin" ? "Amministratore" : "Dipendente"}
              tone={user?.role === "admin" ? "info" : "accent"}
              icon={user?.role === "admin" ? "shield" : "user"}
            />
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Aspetto</Text>
        <Card>
          {MODES.map((m, i) => {
            const active = mode === m.key;
            return (
              <Pressable
                key={m.key}
                style={[styles.modeRow, i < MODES.length - 1 && styles.rowBorder]}
                onPress={() => setMode(m.key)}
                testID={`theme-mode-${m.key}`}
              >
                <View style={styles.modeLeft}>
                  <Icon name={m.icon as any} size={20} color={colors.onSurfaceSecondary} />
                  <Text style={styles.modeLabel}>{m.label}</Text>
                </View>
                {active ? <Icon name="check-circle" size={20} color={colors.brandPrimary} /> : (
                  <View style={styles.radio} />
                )}
              </Pressable>
            );
          })}
        </Card>

        <AppButton
          label="Esci"
          variant="outline"
          icon="log-out"
          onPress={() => setConfirmLogout(true)}
          testID="logout-button"
          style={{ marginTop: 28 }}
        />
      </ScrollView>

      <ConfirmDialog
        visible={confirmLogout}
        title="Uscire dall'account?"
        confirmLabel="Esci"
        danger
        onConfirm={async () => {
          setConfirmLogout(false);
          await logout();
          router.replace("/(auth)/login");
        }}
        onCancel={() => setConfirmLogout(false)}
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 16, paddingBottom: 48 },
  userCard: { alignItems: "center", paddingVertical: 24 },
  avatar: {
    width: 76, height: 76, borderRadius: 999, backgroundColor: colors.brandPrimary,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { color: colors.onBrandPrimary, fontSize: 28, fontWeight: "900" },
  name: { fontSize: 20, fontWeight: "800", color: colors.onSurface, marginTop: 12 },
  email: { fontSize: 14, color: colors.muted, marginTop: 2 },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: colors.muted, marginTop: 24, marginBottom: 10, marginLeft: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  modeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  modeLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  modeLabel: { fontSize: 16, fontWeight: "600", color: colors.onSurfaceSecondary },
  radio: { width: 20, height: 20, borderRadius: 999, borderWidth: 2, borderColor: colors.borderStrong },
}));
