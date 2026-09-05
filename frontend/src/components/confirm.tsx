import { Modal, Pressable, Text, View } from "react-native";
import { AppButton } from "@/src/components/ui";
import { makeStyles } from "@/src/theme";

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = "Conferma",
  cancelLabel = "Annulla",
  danger,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const styles = useStyles();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.sheet} onPress={() => {}} testID="confirm-dialog">
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.actions}>
            <AppButton label={cancelLabel} variant="outline" onPress={onCancel} testID="confirm-cancel" style={{ flex: 1 }} />
            <AppButton
              label={confirmLabel}
              variant={danger ? "danger" : "primary"}
              onPress={onConfirm}
              testID="confirm-ok"
              style={{ flex: 1 }}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const useStyles = makeStyles((colors) => ({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  sheet: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 20,
    padding: 22,
  },
  title: { fontSize: 19, fontWeight: "800", color: colors.onSurface },
  message: { fontSize: 15, color: colors.muted, marginTop: 8, lineHeight: 21 },
  actions: { flexDirection: "row", gap: 12, marginTop: 22 },
}));
