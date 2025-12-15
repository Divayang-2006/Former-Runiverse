import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";
import { api } from "../services/api";
import { authService } from "../services/AuthService";

export function useAvatar(initialUrl?: string | null) {
  const [avatarUrl, setAvatarUrl] = useState(initialUrl ?? "");
  const [loading, setLoading] = useState(false);

  const pickAndUploadAvatar = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Toast.show({ type: "error", text1: "Permission denied" });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) return;

      const uri = result.assets?.[0]?.uri;
      if (!uri) {
        Toast.show({ type: "error", text1: "No image selected" });
        return;
      }

      const formData = new FormData();
      formData.append("avatar", {
        uri,
        type: "image/jpeg",
        name: "avatar.jpg",
      } as any);

      setLoading(true);

      const token = authService.getToken();
      const res = await api.post<{ success: boolean; data?: { avatarUrl: string } }>(
        "/api/avatar/upload",
        formData,
        token
      );

      if (res.success && res.data?.avatarUrl) {
        setAvatarUrl(res.data.avatarUrl);
        Toast.show({ type: "success", text1: "Avatar updated!" });
      } else {
        Toast.show({ type: "error", text1: "Upload failed" });
      }
    } catch (err: any) {
      console.error("Avatar upload error:", err);
      Toast.show({ type: "error", text1: "Upload failed" });
    } finally {
      setLoading(false);
    }
  };

  const deleteAvatar = async () => {
    try {
      setLoading(true);
      const token = authService.getToken();
      const res = await api.delete<{ success: boolean }>("/api/avatar/delete", token);
      if (res.success) {
        setAvatarUrl("");
        Toast.show({ type: "success", text1: "Avatar removed" });
      } else {
        Toast.show({ type: "error", text1: "Delete failed" });
      }
    } catch (err) {
      console.error(err);
      Toast.show({ type: "error", text1: "Delete failed" });
    } finally {
      setLoading(false);
    }
  };

  return { avatarUrl, loading, pickAndUploadAvatar, deleteAvatar };
}
