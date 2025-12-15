// src/components/AvatarUploader.tsx
import React from "react";
import { View, Image, TouchableOpacity, ActivityIndicator, Text } from "react-native";
import { useAvatar } from "../hooks/useAvatar";
import { FontAwesome } from "@expo/vector-icons";

export function AvatarUploader({ initialUrl }: { initialUrl?: string }) {
  const { avatarUrl, loading, pickAndUploadAvatar, deleteAvatar } = useAvatar(initialUrl);

  return (
    <View className="items-center my-6">
      {loading ? (
        <ActivityIndicator size="large" color="#00C853" />
      ) : (
        <>
          {avatarUrl ? (
            <TouchableOpacity onLongPress={deleteAvatar}>
              <Image
                source={{ uri: avatarUrl }}
                className="w-32 h-32 rounded-full border-4 border-green-500"
              />
              <Text className="text-gray-400 text-xs mt-2">(Hold to remove)</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={pickAndUploadAvatar}
              className="w-32 h-32 rounded-full bg-gray-700 items-center justify-center"
            >
              <FontAwesome name="camera" size={30} color="#aaa" />
              <Text className="text-gray-400 text-xs mt-2">Add Avatar</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}
