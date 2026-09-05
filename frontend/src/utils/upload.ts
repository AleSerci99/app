import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";

const API = process.env.EXPO_PUBLIC_BACKEND_URL;

export function fileUrl(path: string, token: string | null): string {
  return `${API}/api/files/${path}?token=${encodeURIComponent(token ?? "")}`;
}

export async function uploadImageAsset(uri: string, token: string | null): Promise<string> {
  const form = new FormData();
  const name = `photo_${Date.now()}.jpg`;
  if (Platform.OS === "web") {
    const blob = await (await fetch(uri)).blob();
    form.append("file", blob, name);
  } else {
    form.append("file", { uri, name, type: "image/jpeg" } as any);
  }
  const res = await fetch(`${API}/api/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token ?? ""}` },
    body: form,
  });
  if (!res.ok) {
    let msg = "Caricamento foto non riuscito";
    try {
      const d = await res.json();
      if (d?.detail) msg = d.detail;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  const data = await res.json();
  return data.path as string;
}

export type PermResult = "granted" | "denied" | "blocked";

export async function ensureCameraPermission(): Promise<PermResult> {
  const perm = await ImagePicker.getCameraPermissionsAsync();
  if (perm.status === "granted") return "granted";
  if (perm.canAskAgain) {
    const req = await ImagePicker.requestCameraPermissionsAsync();
    if (req.status === "granted") return "granted";
    return req.canAskAgain ? "denied" : "blocked";
  }
  return "blocked";
}

export async function ensureLibraryPermission(): Promise<PermResult> {
  const perm = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (perm.status === "granted") return "granted";
  if (perm.canAskAgain) {
    const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (req.status === "granted") return "granted";
    return req.canAskAgain ? "denied" : "blocked";
  }
  return "blocked";
}
