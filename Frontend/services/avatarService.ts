import { api } from "./api";
import * as FileSystem from "expo-file-system";
import { authService } from "./AuthService";
import { AvatarUploadResponse } from "@/store/types";
// type UploadAvatarResponse = { avatarUrl: string };

export const avatarService = {
  async uploadAvatar(imageUri: string): Promise<AvatarUploadResponse> {
    const token = authService.getToken() ?? undefined;
    if (!token) throw new Error("Not authenticated");

    const formData = new FormData();
    formData.append("avatar", {
      uri: imageUri,
      name: "avatar.jpg",
      type: "image/jpeg",
    } as any);

    return api.postForm("/api/avatar/upload", formData, token);
  },

  async deleteAvatar(): Promise<void> {
    const token = authService.getToken() ?? undefined;
    if (!token) throw new Error("Not authenticated");

    await api.delete("/api/avatar/delete", token);
  },
};
