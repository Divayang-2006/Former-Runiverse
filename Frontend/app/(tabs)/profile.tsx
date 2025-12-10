import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, Image, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import type { Href } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useStore } from '@/store/useStore';
import { profileService } from '@/services/profileService';
import { authService } from '@/services/AuthService';
import * as ImagePicker from "expo-image-picker";
import { avatarService } from "@/services/avatarService";
import Toast from "react-native-toast-message";
import { AvatarUploadResponse } from "@/store/types";
import Animated, { FadeInDown, FadeInUp, FadeOutDown, Layout } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import AlertCard from '@/components/AlertCard';

const ProfileScreen = () => {
  const { theme, colors, isDark } = useTheme();
  const user = useStore((s) => s.user);
  const setUser = useStore((s) => s.setUser);
  const isDarkMode = isDark;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bgClass = isDarkMode ? "bg-background-dark" : "bg-background-light";
  const textClass = isDarkMode ? "text-text-primary" : "text-text-light";
  const secondaryTextClass = isDarkMode ? "text-text-secondary" : "text-subtle-light";
  const cardBgClass = isDarkMode ? "bg-card-dark" : "bg-card-light";
  const statTileBg = isDarkMode ? "bg-background-dark" : "bg-background-light";
  const headerGradient = isDarkMode ? colors.gradients.berryBlend : colors.gradients.oceanBreeze;

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

  const profileOptions: Array<{ icon: keyof typeof FontAwesome5.glyphMap; text: string; href?: Href }> = [
    { icon: 'trophy', text: 'My Achievements', href: '/achievements' },
    { icon: 'route', text: 'Route History' },
    { icon: 'user-friends', text: 'Friends & Community' },
  ];

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
      <ScrollView contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
        <View className="pt-6">
          <Animated.View 
            entering={FadeInUp.duration(600).delay(100).springify()}
            layout={Layout.springify()}
          >
            <View 
              className="rounded-3xl overflow-hidden mb-4 shadow-xl"
              style={{
                shadowColor: isDarkMode ? '#000' : '#1a1a1a',
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: isDarkMode ? 0.6 : 0.2,
                shadowRadius: 20,
                elevation: 16,
              }}
            >
              <LinearGradient
                colors={headerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="p-6"
              >
                <View className="relative flex-row items-center mb-5">
                  <View className="relative">
                    <Image
                      source={{ uri: user?.avatarUrl || "https://i.pravatar.cc/150?u=placeholder" }}
                      className="w-28 h-28 rounded-full border-4 border-white/80 shadow-lg"
                    />
                    <Pressable
                      onPress={handleAvatarUpload}
                      className="absolute -bottom-1 -right-1 bg-white/95 dark:bg-black/70 p-2.5 rounded-full shadow-md active:scale-95"
                      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
                    >
                      <Ionicons name="camera" size={18} color={colors.accent.primary} />
                    </Pressable>
                  </View>
                  <View className="ml-5 flex-1">
                    <Text className="text-[26px] font-black tracking-tight leading-tight" style={{ color: colors.text.primary }}>
                      {user?.username || 'Runner'}
                    </Text>
                    <Text className="text-[13px] mt-1.5 font-medium" style={{ color: colors.text.secondary }}>
                      {user?.email || 'user@runiverse.com'}
                    </Text>
                    <View className="flex-row mt-5 gap-6">
                      <View>
                        <Text className="text-[10px] uppercase tracking-widest font-bold" style={{ color: colors.text.tertiary }}>City</Text>
                        <Text className="text-[17px] font-bold mt-1.5" style={{ color: colors.text.primary }}>
                          {user?.city || 'Unknown'}
                        </Text>
                      </View>
                      <View>
                        <Text className="text-[10px] uppercase tracking-widest font-bold" style={{ color: colors.text.tertiary }}>Territories</Text>
                        <Text className="text-[17px] font-bold mt-1.5" style={{ color: colors.text.primary }}>
                          {formatNumber(user?.territories)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
                <Text className="text-[13px] leading-relaxed mb-5 font-medium" style={{ color: colors.text.secondary }}>
                  Every mile is a memory, every run a new discovery in the Runiverse.
                </Text>
                <Link href="../edit-profile" asChild>
                  <Pressable 
                    className="mt-4 self-start bg-white px-7 py-3.5 rounded-full shadow-lg active:scale-95"
                    style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
                  >
                    <Text className="font-bold tracking-wide text-[13px]" style={{ color: colors.accent.primary }}>Edit Profile</Text>
                  </Pressable>
                </Link>
                <Link href="/achievements" asChild>
                  <Pressable
                    className="mt-3 self-start border-2 border-white/70 px-7 py-3.5 rounded-full active:scale-95"
                    style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, backgroundColor: 'transparent' }]}
                  >
                    <Text className="font-bold tracking-wide text-[13px]" style={{ color: colors.background.primary }}>My Achievements</Text>
                  </Pressable>
                </Link>
              </LinearGradient>
            </View>
          </Animated.View>

          {loading && (
            <Animated.View 
              entering={FadeInDown.duration(400).springify()}
              exiting={FadeOutDown.duration(300)}
              layout={Layout.springify()}
              className="mb-4"
            >
              <AlertCard
                type="info"
                title="Refreshing profile"
                message="Pulling the latest stats…"
                leading={<ActivityIndicator color={colors.status.info} />}
              />
            </Animated.View>
          )}

          {error && (
            <Animated.View 
              entering={FadeInDown.duration(400).springify()}
              exiting={FadeOutDown.duration(300)}
              layout={Layout.springify()}
              className="mb-4"
            >
              <AlertCard type="error" title="Something went wrong" message={error} />
            </Animated.View>
          )}

          {/* <Animated.View 
            entering={FadeInDown.duration(600).delay(200).springify()}
            layout={Layout.springify()}
            className="rounded-3xl p-6 mb-4"
            style={{
              backgroundColor: isDarkMode ? colors.background.elevated : colors.background.secondary,
              shadowColor: isDarkMode ? '#000' : '#1a1a1a',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: isDarkMode ? 0.5 : 0.15,
              shadowRadius: 16,
              elevation: 12,
            }}
          >
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-[22px] font-bold tracking-tight" style={{ color: colors.text.primary }}>Progress Overview</Text>
              <View className="px-3.5 py-2 rounded-xl" style={{ backgroundColor: `${colors.status.success}20` }}>
                <Text className="text-[10px] font-bold tracking-widest" style={{ color: colors.status.success }}>LIVE</Text>
              </View>
            </View>
            <View className="flex-row flex-wrap -mx-2">
              {stats.map((stat, idx) => (
                <Animated.View 
                  key={stat.key} 
                  entering={FadeInDown.duration(600).delay(300 + idx * 50).springify()}
                  layout={Layout.springify()}
                  className="w-1/2 px-2 pb-4"
                >
                  <View
                    className="rounded-2xl p-5"
                    style={{ 
                      backgroundColor: isDarkMode ? colors.background.tertiary : colors.background.primary,
                      borderWidth: 1, 
                      borderColor: isDarkMode ? colors.border.medium : colors.border.light,
                      shadowColor: isDarkMode ? '#000' : '#1a1a1a',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: isDarkMode ? 0.3 : 0.08,
                      shadowRadius: 8,
                      elevation: 6,
                    }}
                  >
                    <Text className="text-[11px] uppercase tracking-widest font-bold mb-2" style={{ color: colors.text.secondary }}>{stat.label}</Text>
                    <Text className="text-[24px] font-black tracking-tight" style={{ color: colors.text.primary }}>{stat.value}</Text>
                  </View>
                </Animated.View>
              ))}
            </View>
          </Animated.View> */}

          <Animated.View 
            entering={FadeInDown.duration(600).delay(400).springify()}
            layout={Layout.springify()}
            className="rounded-3xl p-6 mb-4"
            style={{
              backgroundColor: isDarkMode ? colors.background.elevated : colors.background.secondary,
              shadowColor: isDarkMode ? '#000' : '#1a1a1a',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: isDarkMode ? 0.5 : 0.15,
              shadowRadius: 16,
              elevation: 12,
            }}
          >
            <Text className="text-[20px] font-bold mb-5 tracking-tight" style={{ color: colors.text.primary }}>Account Details</Text>
            <InfoRow label="Email" value={user?.email || 'Not provided'} />
            <View className="mt-4">
              <InfoRow label="Member since" value={user ? new Date().getFullYear().toString() : '—'} />
            </View>
          </Animated.View>

          <Animated.View 
            entering={FadeInDown.duration(600).delay(500).springify()}
            layout={Layout.springify()}
            className="rounded-3xl overflow-hidden mb-4"
            style={{
              backgroundColor: isDarkMode ? colors.background.elevated : colors.background.secondary,
              shadowColor: isDarkMode ? '#000' : '#1a1a1a',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: isDarkMode ? 0.5 : 0.15,
              shadowRadius: 16,
              elevation: 12,
            }}
          >
            {profileOptions.map((option, idx) => (
              <ProfileOption
                key={option.text}
                icon={option.icon}
                text={option.text}
                href={option.href}
                isDarkMode={isDarkMode}
                isLast={idx === profileOptions.length - 1}
              />
            ))}
          </Animated.View>

          <Animated.View 
            entering={FadeInDown.duration(600).delay(550).springify()}
            layout={Layout.springify()}
            className="rounded-3xl p-1 mb-4"
            style={{
              backgroundColor: isDarkMode ? colors.background.elevated : colors.background.secondary,
              shadowColor: isDarkMode ? '#000' : '#1a1a1a',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: isDarkMode ? 0.5 : 0.15,
              shadowRadius: 16,
              elevation: 12,
            }}
          >
            <Link href="/settings" asChild>
              <Pressable 
                className="rounded-3xl overflow-hidden flex-row items-center justify-between py-5 px-6 active:opacity-80"
                style={({ pressed }) => [{
                  opacity: pressed ? 0.7 : 1,
                  backgroundColor: isDarkMode ? colors.background.elevated : colors.background.secondary,
                  shadowColor: isDarkMode ? '#000' : '#1a1a1a',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: isDarkMode ? 0.5 : 0.15,
                  shadowRadius: 16,
                  elevation: 12,
                }]}
              >
                <View className="flex-row items-center flex-1">
                  <View className="p-3.5 rounded-2xl mr-4" style={{ backgroundColor: `${colors.accent.primary}15` }}>
                    <Ionicons
                      name="settings"
                      size={24}
                      color={isDarkMode ? colors.accent.hover : colors.accent.primary}
                    />
                  </View>
                  <Text className="text-[17px] font-bold tracking-tight" style={{ color: colors.text.primary }}>Settings</Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color={colors.text.secondary} />
              </Pressable>
            </Link>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

interface ProfileOptionProps {
  icon: keyof typeof FontAwesome5.glyphMap;
  text: string;
  isDarkMode: boolean;
  isLast?: boolean;
  href?: string;
}

const ProfileOption = ({ icon, text, isDarkMode, isLast = false, href }: ProfileOptionProps) => {
  const { colors } = useTheme();
  const borderColor = isDarkMode ? colors.border.medium : colors.border.light;
  const iconBackground = isDarkMode ? colors.background.tertiary : colors.background.secondary;
  const iconBorder = isDarkMode ? colors.border.dark : colors.border.light;

  const content = (
    <Pressable
      className="flex-row items-center py-5 px-6"
      style={({ pressed }) => [{
        opacity: pressed ? 0.85 : 1,
        borderBottomWidth: isLast ? 0 : 1,
        borderColor,
        backgroundColor: pressed ? colors.overlay.subtle : 'transparent',
      }]}
    >
      <View
        style={{
          backgroundColor: iconBackground,
          padding: 14,
          borderRadius: 18,
          marginRight: 16,
          borderWidth: 1,
          borderColor: iconBorder,
        }}
      >
        <FontAwesome5
          name={icon}
          size={20}
          color={isDarkMode ? colors.accent.hover : colors.accent.primary}
        />
      </View>
      <Text
        className="flex-1 text-[17px] font-bold tracking-tight"
        style={{ color: colors.text.primary }}
      >
        {text}
      </Text>
      <Ionicons name="chevron-forward" size={22} color={colors.text.secondary} />
    </Pressable>
  );

  if (href) {
    return (
      <Link href={href} asChild>
        {content}
      </Link>
    );
  }

  return content;
};

interface InfoRowProps {
  label: string;
  value: string;
}

const InfoRow = ({ label, value }: InfoRowProps) => {
  const { colors } = useTheme();
  return (
    <View className="flex-row justify-between items-center">
      <Text className="text-[13px] font-medium" style={{ color: colors.text.secondary }}>{label}</Text>
      <Text className="text-[14px] font-bold" style={{ color: colors.text.primary }}>{value}</Text>
    </View>
  );
};

export default ProfileScreen;