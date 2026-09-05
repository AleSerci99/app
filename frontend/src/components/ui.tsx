import { ReactNode } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { makeStyles, useTheme } from "@/src/theme";
import { Icon } from "@/src/components/icon";

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

// --------------------------------------------------------------------------
// Header
// --------------------------------------------------------------------------
export function Header({
  title,
  subtitle,
  right,
  onBack,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onBack?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const styles = useHeaderStyles();
  const { colors } = useTheme();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 10 }]}>
      <View style={styles.row}>
        {onBack && (
          <Pressable onPress={onBack} hitSlop={12} style={styles.back} testID="header-back">
            <Icon name="chevron-left" size={26} color={colors.onSurface} />
          </Pressable>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
    </View>
  );
}

const useHeaderStyles = makeStyles((colors) => ({
  wrap: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  back: { marginLeft: -6 },
  title: { fontSize: 22, fontWeight: "800", color: colors.onSurface },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 2 },
}));

// --------------------------------------------------------------------------
// Button
// --------------------------------------------------------------------------
export function AppButton({
  label,
  onPress,
  variant = "primary",
  loading,
  disabled,
  icon,
  testID,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "danger";
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  testID?: string;
  style?: ViewStyle;
}) {
  const styles = useButtonStyles();
  const { colors } = useTheme();
  const isDisabled = disabled || loading;
  const bg =
    variant === "primary" ? colors.brandPrimary
    : variant === "secondary" ? colors.brandSecondary
    : variant === "danger" ? colors.error
    : "transparent";
  const fg =
    variant === "primary" ? colors.onBrandPrimary
    : variant === "secondary" ? colors.onBrandSecondary
    : variant === "danger" ? colors.onError
    : colors.brandPrimary;
  return (
    <Pressable
      testID={testID}
      onPress={() => { haptic(); onPress(); }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: isDisabled ? 0.55 : pressed ? 0.85 : 1 },
        variant === "outline" && { borderWidth: 1.5, borderColor: colors.brandPrimary },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.inner}>
          {icon ? <Icon name={icon as any} size={18} color={fg} /> : null}
          <Text style={[styles.label, { color: fg }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const useButtonStyles = makeStyles(() => ({
  btn: {
    minHeight: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  inner: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { fontSize: 16, fontWeight: "700" },
}));

// --------------------------------------------------------------------------
// Input
// --------------------------------------------------------------------------
export function AppInput({
  label,
  icon,
  ...props
}: TextInputProps & { label?: string; icon?: string }) {
  const styles = useInputStyles();
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.field}>
        {icon ? <Icon name={icon as any} size={18} color={colors.muted} /> : null}
        <TextInput
          placeholderTextColor={colors.muted}
          style={styles.input}
          {...props}
        />
      </View>
    </View>
  );
}

const useInputStyles = makeStyles((colors) => ({
  label: { fontSize: 13, fontWeight: "600", color: colors.onSurfaceTertiary },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: colors.onSurface },
}));

// --------------------------------------------------------------------------
// Card
// --------------------------------------------------------------------------
export function Card({ children, style, onPress, testID }: {
  children: ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  testID?: string;
}) {
  const styles = useCardStyles();
  if (onPress) {
    return (
      <Pressable
        testID={testID}
        onPress={() => { haptic(); onPress(); }}
        style={({ pressed }) => [styles.card, { opacity: pressed ? 0.9 : 1 }, style]}
      >
        {children}
      </Pressable>
    );
  }
  return <View testID={testID} style={[styles.card, style]}>{children}</View>;
}

const useCardStyles = makeStyles((colors) => ({
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
}));

// --------------------------------------------------------------------------
// Badge
// --------------------------------------------------------------------------
export function Badge({ label, tone = "neutral", icon }: {
  label: string;
  tone?: "neutral" | "success" | "warning" | "info" | "accent";
  icon?: string;
}) {
  const { colors } = useTheme();
  const map = {
    neutral: { bg: colors.surfaceTertiary, fg: colors.onSurfaceTertiary },
    success: { bg: colors.success, fg: colors.onSuccess },
    warning: { bg: colors.warning, fg: colors.onWarning },
    info: { bg: colors.info, fg: colors.onInfo },
    accent: { bg: colors.brandTertiary, fg: colors.onBrandTertiary },
  }[tone];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: map.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
      {icon ? <Icon name={icon as any} size={12} color={map.fg} /> : null}
      <Text style={{ color: map.fg, fontSize: 12, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

// --------------------------------------------------------------------------
// EmptyState / Loading / ErrorState
// --------------------------------------------------------------------------
export function EmptyState({ icon, title, message, action }: {
  icon: string;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  const styles = useStateStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>
        <Icon name={icon as any} size={34} color={colors.brandPrimary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {action ? <View style={{ marginTop: 16, alignSelf: "stretch" }}>{action}</View> : null}
    </View>
  );
}

export function LoadingView({ label }: { label?: string }) {
  const styles = useStateStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.wrap} testID="loading-view">
      <ActivityIndicator size="large" color={colors.brandPrimary} />
      {label ? <Text style={styles.message}>{label}</Text> : null}
    </View>
  );
}

const useStateStyles = makeStyles((colors) => ({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 10 },
  iconCircle: {
    width: 76, height: 76, borderRadius: 999,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center", justifyContent: "center", marginBottom: 6,
  },
  title: { fontSize: 18, fontWeight: "800", color: colors.onSurface, textAlign: "center" },
  message: { fontSize: 14, color: colors.muted, textAlign: "center", lineHeight: 20 },
}));

// --------------------------------------------------------------------------
// FAB
// --------------------------------------------------------------------------
export function Fab({ icon, label, onPress, testID }: {
  icon: string;
  label?: string;
  onPress: () => void;
  testID?: string;
}) {
  const insets = useSafeAreaInsets();
  const styles = useFabStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={() => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); onPress(); }}
      hitSlop={12}
      style={({ pressed }) => [styles.fab, { bottom: insets.bottom + 20, opacity: pressed ? 0.9 : 1 }]}
    >
      <Icon name={icon as any} size={22} color={colors.onBrandPrimary} />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </Pressable>
  );
}

const useFabStyles = makeStyles((colors) => ({
  fab: {
    position: "absolute",
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 20,
    height: 56,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  label: { color: colors.onBrandPrimary, fontSize: 15, fontWeight: "700" },
}));

// --------------------------------------------------------------------------
// Chip (for horizontal filter rows)
// --------------------------------------------------------------------------
export function Chip({ label, selected, onPress, testID }: {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={() => { haptic(); onPress(); }}
      style={{
        flexShrink: 0,
        height: 36,
        paddingHorizontal: 16,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: selected ? colors.brandPrimary : colors.surfaceTertiary,
        borderWidth: 1,
        borderColor: selected ? colors.brandPrimary : colors.border,
      }}
    >
      <Text style={{ color: selected ? colors.onBrandPrimary : colors.onSurfaceTertiary, fontWeight: "700", fontSize: 13 }}>
        {label}
      </Text>
    </Pressable>
  );
}
