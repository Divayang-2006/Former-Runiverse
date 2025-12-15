import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useStore } from '@/store/useStore';
import { profileService } from '@/services/profileService';
import { authService } from '@/services/AuthService';
import * as ImagePicker from "expo-image-picker";
import { avatarService } from "@/services/avatarService";
import Toast from "react-native-toast-message";
import { AvatarUploadResponse } from "@/store/types";

const ProfileScreen = () => {
  const { theme } = useTheme();
  const user = useStore((s) => s.user);
  const setUser = useStore((s) => s.setUser);
  const isDarkMode = theme === 'dark';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bgClass = isDarkMode ? "bg-background-dark" : "bg-gray-100";
  const textClass = isDarkMode ? "text-text-primary" : "text-gray-900";
  const secondaryTextClass = isDarkMode ? "text-text-secondary" : "text-gray-600";
  const cardBgClass = isDarkMode ? "bg-card-dark" : "bg-white";
  const iconColor = isDarkMode ? "white" : "black";
  const statTileBg = isDarkMode ? "bg-gray-800" : "bg-gray-100";

  const formatNumber = (value?: number | null) => {
    if (value === undefined || value === null) return '—';
    return new Intl.NumberFormat().format(value);
  };

  const formatDistance = (value?: number | null) => {
    if (value === undefined || value === null || !Number.isFinite(value)) return '—';
    if (value >= 1000) {
      const km = value / 1000;
      const precision = km >= 10 ? 1 : 2;
      return `${km.toFixed(precision)} km`;
    }
    return `${Math.round(value)} m`;
  };

  const stats = useMemo(
    () => [
      { key: 'steps-today', label: 'Today\'s Steps', value: formatNumber(user?.steps) },
      { key: 'distance-today', label: 'Today\'s Distance', value: formatDistance(user?.distance) },
      { key: 'lifetime-steps', label: 'All-Time Steps', value: formatNumber(user?.lifetimeSteps) },
      { key: 'lifetime-distance', label: 'All-Time Distance', value: formatDistance(user?.lifetimeDistance) },
      { key: 'territories', label: 'Territories Captured', value: formatNumber(user?.territories) },
    ],
    [user?.distance, user?.lifetimeDistance, user?.lifetimeSteps, user?.steps, user?.territories]
  );

  const handleAvatarUpload = async () => {
    try {
      const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!granted) {
        Toast.show({
          type: "error",
          text1: "Permission denied",
          text2: "Cannot access gallery",
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) return;

      setLoading(true);

      const uploadRes = (await avatarService.uploadAvatar(result.assets[0].uri)) as AvatarUploadResponse;


      if (uploadRes?.success && uploadRes.data?.avatarUrl) {
        setUser({
          id: user?.id ?? "",
          username: user?.username ?? "Unknown",
          avatarUrl: uploadRes.data?.avatarUrl ?? user?.avatarUrl ?? "",
          groupId: user?.groupId ?? null,
          email: user?.email,
          steps: user?.steps,
          distance: user?.distance,
          territories: user?.territories,
          displayName: user?.displayName,
          city: user?.city,
          lifetimeSteps: user?.lifetimeSteps,
          lifetimeDistance: user?.lifetimeDistance,
          token: user?.token,
        });
        Toast.show({ type: "success", text1: "Avatar updated!" });
      } else {
        Toast.show({
          type: "error",
          text1: uploadRes?.message || "Upload failed",
        });
      }
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Error uploading avatar",
        text2: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!authService.getToken()) return; // not logged in yet
      try {
        setLoading(true);
        const { success, data, message } = await profileService.fetchMe();
        if (success && data) {
          const current = useStore.getState().user;
          const merged = current ? { ...current, ...data } : (data as any);
          setUser(merged as any);
          setError(null);
        } else if (!success) {
          setError(message || 'Failed to load profile');
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [setUser]);

  return (
    <SafeAreaView className={`flex-1 ${bgClass}`}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-6 pt-6">
          <View className={`rounded-3xl p-6 mb-6 shadow-lg bg-gradient-to-br from-primary/95 to-emerald-500 dark:from-primary dark:to-emerald-600`}>
            <View className="relative">
              <Image
                source={{ uri: user?.avatarUrl || "https://i.pravatar.cc/150?u=placeholder" }}
                className="w-24 h-24 rounded-full mr-4 border-2 border-white/80"
              />
              <TouchableOpacity
                onPress={handleAvatarUpload}
                className="absolute bottom-0 right-2 bg-white p-2 rounded-full"
              >
                <Ionicons name="camera" size={16} color="#00C853" />
              </TouchableOpacity>
            </View>
            <Text className="mt-4 text-sm text-white/80">
              Every mile is a memory, every run a new discovery in the Runiverse.
            </Text>
            <View className="mt-4 flex-row justify-between">
              <View>
                <Text className="text-white/60 text-xs">City</Text>
                <Text className="text-lg font-semibold text-white">{user?.city || 'Unknown'}</Text>
              </View>
              <View className="items-end">
                <Text className="text-white/60 text-xs">Territories</Text>
                <Text className="text-lg font-semibold text-white">{formatNumber(user?.territories)}</Text>
              </View>
            </View>
            <Link href="../edit-profile" asChild>
              <TouchableOpacity className="mt-6 self-start bg-white px-4 py-2 rounded-full">
                <Text className="text-primary font-semibold">Edit profile</Text>
              </TouchableOpacity>
            </Link>
          </View>

          {loading && (
            <View className="flex-row items-center mb-4">
              <ActivityIndicator color={iconColor} />
              <Text className={`ml-3 ${secondaryTextClass}`}>Refreshing profile…</Text>
            </View>
          )}

          {error && (
            <Text className={`mb-4 ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>{error}</Text>
          )}

          <View className={`rounded-3xl p-6 mb-6 shadow-md ${cardBgClass}`}>
            <View className="flex-row justify-between items-center">
              <Text className={`text-xl font-semibold ${textClass}`}>Progress Overview</Text>
              <Text className={`text-xs ${secondaryTextClass}`}>Auto-sync keeps stats fresh</Text>
            </View>
            <View className="mt-4 flex-row flex-wrap -mx-2">
              {stats.map((stat) => (
                <View key={stat.key} className="w-1/2 px-2 pb-4">
                  <View className={`rounded-2xl p-4 ${statTileBg} shadow-sm`}>
                    <Text className={`${secondaryTextClass} text-xs uppercase tracking-wide`}>{stat.label}</Text>
                    <Text className={`text-2xl font-bold mt-2 ${textClass}`}>{stat.value}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View className={`rounded-3xl p-6 shadow-md ${cardBgClass}`}>
            <Text className={`text-xl font-semibold mb-2 ${textClass}`}>Account details</Text>
            <InfoRow label="Email" value={user?.email || 'Not provided'} isDarkMode={isDarkMode} />
            <View className="mt-3">
              <InfoRow label="Member since" value={user ? new Date().getFullYear().toString() : '—'} isDarkMode={isDarkMode} />
            </View>
          </View>

          <View className={`mt-6 rounded-3xl shadow-md ${cardBgClass}`}>
            <ProfileOption icon="trophy" text="My Achievements" isDarkMode={isDarkMode} />
            <ProfileOption icon="route" text="Route History" isDarkMode={isDarkMode} />
            <ProfileOption icon="user-friends" text="Friends & Community" isDarkMode={isDarkMode} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

interface ProfileOptionProps {
  icon: keyof typeof FontAwesome5.glyphMap;
  text: string;
  isDarkMode: boolean;
}

const ProfileOption = ({ icon, text, isDarkMode }: ProfileOptionProps) => (
  <TouchableOpacity className={`flex-row items-center py-4 px-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} last:border-b-0`}>
    <FontAwesome5 name={icon} size={20} color={isDarkMode ? '#FFFFFF' : '#000000'} className="mr-4" />
    <Text className={`flex-1 text-lg ${isDarkMode ? 'text-text-primary' : 'text-gray-900'}`}>{text}</Text>
    <Ionicons name="chevron-forward" size={20} color={isDarkMode ? '#A9A9A9' : '#666666'} />
  </TouchableOpacity>
);

interface InfoRowProps {
  label: string;
  value: string;
  isDarkMode: boolean;
}

const InfoRow = ({ label, value, isDarkMode }: InfoRowProps) => (
  <View className="flex-row justify-between">
    <Text className={`${isDarkMode ? 'text-text-secondary' : 'text-gray-500'} text-sm`}>{label}</Text>
    <Text className={`${isDarkMode ? 'text-text-primary' : 'text-gray-900'} text-sm font-medium`}>{value}</Text>
  </View>
);

export default ProfileScreen;