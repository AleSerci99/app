import { useState } from "react";
import { ActivityIndicator, Linking, Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/src/components/icon";
import { ConfirmDialog } from "@/src/components/confirm";
import { useToast } from "@/src/components/toast";
import { useAuth } from "@/src/context/auth";
import { makeStyles, useTheme } from "@/src/theme";
import { fileUrl, uploadImageAsset, ensureCameraPermission, ensureLibraryPermission } from "@/src/utils/upload";

// ---------------------------------------------------------------------------
// Read-only gallery with fullscreen viewer
// ---------------------------------------------------------------------------
export function PhotoGallery({ photos }: { photos: string[] }) {
  const styles = useStyles();
  const { token } = useAuth();
  const [viewer, setViewer] = useState<string | null>(null);
  if (!photos || photos.length === 0) return null;
  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbRow}>
        {photos.map((p) => (
          <Pressable key={p} onPress={() => setViewer(p)} testID={`photo-thumb-${p}`}>
            <Image source={{ uri: fileUrl(p, token) }} style={styles.thumb} contentFit="cover" transition={150} />
          </Pressable>
        ))}
      </ScrollView>
      <Modal visible={!!viewer} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
        <Pressable style={styles.viewerBackdrop} onPress={() => setViewer(null)}>
          {viewer ? <Image source={{ uri: fileUrl(viewer, token) }} style={styles.viewerImg} contentFit="contain" /> : null}
          <Pressable style={styles.viewerClose} onPress={() => setViewer(null)} testID="photo-viewer-close">
            <Icon name="x" size={26} color="#FFFFFF" />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------------------
// Editable picker (add camera/gallery, remove)
// ---------------------------------------------------------------------------
export function PhotoPicker({ photos, onChange }: { photos: string[]; onChange: (p: string[]) => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { token } = useAuth();
  const toast = useToast();
  const [sourceOpen, setSourceOpen] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [uploading, setUploading] = useState(false);
  const insets = useSafeAreaInsets();

  const doUpload = async (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !result.assets?.length) return;
    setUploading(true);
    try {
      const paths: string[] = [];
      for (const a of result.assets) {
        const path = await uploadImageAsset(a.uri, token);
        paths.push(path);
      }
      onChange([...photos, ...paths]);
    } catch (e: any) {
      toast(e?.message ?? "Errore caricamento", "error");
    } finally {
      setUploading(false);
    }
  };

  const fromCamera = async () => {
    setSourceOpen(false);
    const perm = await ensureCameraPermission();
    if (perm === "blocked") return setBlocked(true);
    if (perm !== "granted") return toast("Permesso fotocamera negato", "error");
    const res = await ImagePicker.launchCameraAsync({ quality: 0.6, mediaTypes: ["images"] });
    await doUpload(res);
  };

  const fromLibrary = async () => {
    setSourceOpen(false);
    const perm = await ensureLibraryPermission();
    if (perm === "blocked") return setBlocked(true);
    if (perm !== "granted") return toast("Permesso galleria negato", "error");
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.6, mediaTypes: ["images"], allowsMultipleSelection: true, selectionLimit: 5 });
    await doUpload(res);
  };

  const removePhoto = (p: string) => onChange(photos.filter((x) => x !== p));

  return (
    <View>
      <Text style={styles.label}>Foto lavorazioni</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbRow}>
        <Pressable style={styles.addBtn} onPress={() => setSourceOpen(true)} disabled={uploading} testID="add-photo-button">
          {uploading ? (
            <ActivityIndicator color={colors.brandPrimary} />
          ) : (
            <>
              <Icon name="camera" size={22} color={colors.brandPrimary} />
              <Text style={styles.addText}>Aggiungi</Text>
            </>
          )}
        </Pressable>
        {photos.map((p) => (
          <View key={p} style={styles.thumbWrap} testID={`photo-item-${p}`}>
            <Image source={{ uri: fileUrl(p, token) }} style={styles.thumb} contentFit="cover" transition={150} />
            <Pressable style={styles.removeBtn} onPress={() => removePhoto(p)} testID={`remove-photo-${p}`}>
              <Icon name="x" size={14} color="#FFFFFF" />
            </Pressable>
          </View>
        ))}
      </ScrollView>

      <Modal visible={sourceOpen} transparent animationType="slide" onRequestClose={() => setSourceOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setSourceOpen(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]} onPress={() => {}}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Aggiungi foto</Text>
            <Text style={styles.sheetHint}>Documenta le lavorazioni svolte in cantiere.</Text>
            {Platform.OS !== "web" && (
              <Pressable style={styles.sourceRow} onPress={fromCamera} testID="source-camera">
                <Icon name="camera" size={22} color={colors.brandPrimary} />
                <Text style={styles.sourceLabel}>Scatta una foto</Text>
              </Pressable>
            )}
            <Pressable style={styles.sourceRow} onPress={fromLibrary} testID="source-gallery">
              <Icon name="image" size={22} color={colors.brandSecondary} />
              <Text style={styles.sourceLabel}>Scegli dalla galleria</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmDialog
        visible={blocked}
        title="Permesso necessario"
        message="Per aggiungere foto concedi l'accesso a fotocamera/galleria dalle impostazioni del dispositivo."
        confirmLabel="Apri impostazioni"
        onConfirm={() => { setBlocked(false); Linking.openSettings(); }}
        onCancel={() => setBlocked(false)}
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  label: { fontSize: 13, fontWeight: "700", color: colors.onSurfaceTertiary, marginBottom: 8, marginTop: 18 },
  thumbRow: { gap: 10, paddingVertical: 2 },
  addBtn: {
    width: 80, height: 80, borderRadius: 14, borderWidth: 1.5, borderStyle: "dashed",
    borderColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", gap: 4,
    backgroundColor: colors.surfaceTertiary,
  },
  addText: { fontSize: 11, fontWeight: "700", color: colors.brandPrimary },
  thumbWrap: { width: 80, height: 80 },
  thumb: { width: 80, height: 80, borderRadius: 14, backgroundColor: colors.surfaceTertiary },
  removeBtn: {
    position: "absolute", top: -6, right: -6, width: 24, height: 24, borderRadius: 999,
    backgroundColor: colors.error, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: colors.surface,
  },
  sheetBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surfaceSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  handle: { width: 40, height: 4, borderRadius: 999, backgroundColor: colors.borderStrong, alignSelf: "center", marginBottom: 14 },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: colors.onSurface },
  sheetHint: { fontSize: 13, color: colors.muted, marginTop: 4, marginBottom: 8 },
  sourceRow: {
    flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: colors.divider,
  },
  sourceLabel: { fontSize: 16, fontWeight: "600", color: colors.onSurface },
  viewerBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center" },
  viewerImg: { width: "100%", height: "80%" },
  viewerClose: { position: "absolute", top: 50, right: 20, width: 44, height: 44, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
}));
