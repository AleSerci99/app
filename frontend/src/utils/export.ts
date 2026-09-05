import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

export async function saveAndShare(filename: string, mime: string, base64: string): Promise<void> {
  if (Platform.OS === "web") {
    const doc = (globalThis as any).document;
    if (doc) {
      const link = doc.createElement("a");
      link.href = `data:${mime};base64,${base64}`;
      link.download = filename;
      doc.body.appendChild(link);
      link.click();
      doc.body.removeChild(link);
    }
    return;
  }
  const uri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
  const available = await Sharing.isAvailableAsync();
  if (available) {
    await Sharing.shareAsync(uri, { mimeType: mime, dialogTitle: filename });
  }
}
