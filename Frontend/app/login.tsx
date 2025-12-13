import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../services/AuthService';
import { useStore } from '@/store/useStore';
import { profileService } from '@/services/profileService';
import { activityService } from '@/services/activityService';
import axios from "axios";
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';


const LoginScreen = () => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const router = useRouter();
  const setUser = useStore((s) => s.setUser);
  const user = useStore((s) => s.user);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.replace('/(tabs)');
    }
  }, [user, router]);

  const handleLogin = async () => {
    if (!identifier || !password) {
      Alert.alert('Missing Info', 'Email or username and password are required');
      return;
    }

    setLoading(true);

    try {
      const result = await authService.login(identifier.trim(), password);

      if (result.success && result.token) {
        let normalizedUser: any = null;

        if (result.user) {
          normalizedUser = {
            ...result.user,
            id: result.user._id || result.user.id,
            token: result.token,
            avatarUrl: result.user.avatar || result.user.avatarUrl || null,
          };
        }

        // ✅ Update Zustand (persisted automatically)
        setUser(normalizedUser);

        // ✅ Set global axios header
        axios.defaults.headers.common["Authorization"] = `Bearer ${result.token}`;
        console.log("✅ Logged in user:", normalizedUser);
        console.log("✅ Token saved:", normalizedUser?.token);

        try {
          const me = await profileService.fetchMe();
          if (me.success && me.data) {
            normalizedUser = {
              ...(normalizedUser || {}),
              ...me.data,
            };
          } else if (!me.success && me.message) {
            console.warn('Failed to hydrate user profile:', me.message);
          }
        } catch (profileError) {
          console.warn('Profile fetch failed:', profileError);
        }

        if (normalizedUser) {
          setUser(normalizedUser as any);
        }

        try {
          await activityService.fetchActivities({ limit: 50 });
        } catch (activityError) {
          console.warn('Activity prefetch failed:', activityError);
        }

        Alert.alert('✅ Success', result.message || 'Logged in successfully');
        router.replace('/(tabs)');
      } else {
        Alert.alert('❌ Error', result.message || 'Unable to log in');
      }

    } catch (error: any) {
      Alert.alert('Login Error', error?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }

  };

  const bgClass = isDarkMode ? 'bg-background-dark' : 'bg-gray-100';
  const textClass = isDarkMode ? 'text-text-primary' : 'text-gray-900';
  const secondaryTextClass = isDarkMode ? 'text-text-secondary' : 'text-gray-500';
  const inputBgClass = isDarkMode ? 'bg-card-dark' : 'bg-gray-200';
  const inputTextClass = isDarkMode ? 'text-white' : 'text-black';
  const iconColor = isDarkMode ? 'white' : 'black';

  return (
    <SafeAreaView className={`flex-1 ${bgClass}`}>
      <View className="px-6 py-4">
        <Link href="/" asChild>
          <Pressable 
            className="p-2 self-start rounded-full active:bg-gray-200 dark:active:bg-gray-800" 
            disabled={loading}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="arrow-back" size={28} color={iconColor} />
          </Pressable>
        </Link>
      </View>

      <View className="flex-1 justify-center p-6">
        <Animated.View entering={FadeInUp.duration(600).delay(100)}>
          <Text className={`text-5xl font-bold mb-3 ${textClass} tracking-tight`}>Welcome Back!</Text>
          <Text className={`text-lg mb-10 ${secondaryTextClass} leading-relaxed`}>Log in to continue your journey.</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(200)} className={`rounded-2xl mb-4 ${inputBgClass} shadow-sm`}>
          <TextInput
            placeholder="Email or Username"
            placeholderTextColor={isDarkMode ? '#9CA3AF' : '#6B7280'}
            className={`p-5 text-base ${inputTextClass}`}
            autoCapitalize="none"
            value={identifier}
            onChangeText={setIdentifier}
            editable={!loading}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(300)} className={`rounded-2xl mb-8 ${inputBgClass} shadow-sm`}>
          <TextInput
            placeholder="Password"
            placeholderTextColor={isDarkMode ? '#9CA3AF' : '#6B7280'}
            className={`p-5 text-base ${inputTextClass}`}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!loading}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(400)}>
          <Pressable
            onPress={handleLogin}
            disabled={loading}
            className="bg-primary-green p-5 rounded-2xl items-center justify-center shadow-lg shadow-primary-green/30 active:scale-98"
            style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text className="text-black text-lg font-bold tracking-wide">Log In</Text>
            )}
          </Pressable>

          <View className="flex-row justify-center mt-8">
            <Text className={`text-base ${secondaryTextClass}`}>Don&apos;t have an account? </Text>
            <Link href="/register">
              <Text className="text-primary-green font-bold text-base">Sign Up</Text>
            </Link>
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

export default LoginScreen;