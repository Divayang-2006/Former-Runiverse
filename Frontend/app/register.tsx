import React, { useState } from 'react';
import { View, Text, Pressable, Image, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, TextInput } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';
import { authService } from '../services/AuthService';
import { useStore } from '@/store/useStore';
import { profileService } from '@/services/profileService';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';

export default function RegisterScreen() {
  const router = useRouter();
  const setUser = useStore((s) => s.setUser);
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedUsername || !trimmedEmail || !password || !confirmPassword) {
      Alert.alert('Validation', 'All fields are required');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Validation', 'Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Validation', 'Passwords do not match');
      return;
    }
    try {
      setLoading(true);
      const payload = {
        username: trimmedUsername,
        email: trimmedEmail,
        password,
      };

      const result = await authService.register(payload);

      if (result.success && result.token) {
        let normalizedUser: any = null;

        if (result.user) {
          normalizedUser = {
            ...result.user,
            id: result.user._id || result.user.id,
            avatarUrl: result.user.avatar || result.user.avatarUrl || null,
            token: result.token,
          };
        } else {
          normalizedUser = {
            id: undefined,
            username: trimmedUsername,
            email: trimmedEmail,
            token: result.token,
            avatarUrl: null,
          };
        }

        try {
          const me = await profileService.fetchMe();
          if (me.success && me.data) {
            normalizedUser = {
              ...(normalizedUser || {}),
              ...me.data,
            };
          }
        } catch (profileError) {
          console.warn('Profile fetch failed:', profileError);
        }

        if (!normalizedUser) {
          normalizedUser = {
            id: undefined,
            username: trimmedUsername,
            email: trimmedEmail,
            token: result.token,
            avatarUrl: null,
          };
        }

        setUser(normalizedUser as any);

        Alert.alert('✅ Success', result.message || 'Account created successfully!');
        router.replace('/(tabs)');
      } else {
        Alert.alert('❌ Error', result.message || 'Registration failed');
      }
    } catch (e: any) {
      Alert.alert('❌ Error', e?.message || 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  const bgClass = isDarkMode ? 'bg-background-dark' : 'bg-gray-100';
  const textClass = isDarkMode ? 'text-text-primary' : 'text-gray-900';
  const secondaryTextClass = isDarkMode ? 'text-text-secondary' : 'text-gray-500';
  const inputBgClass = isDarkMode ? 'bg-card-dark' : 'bg-gray-200';
  const inputTextClass = isDarkMode ? 'text-white' : 'text-black';
  const placeholderColor = isDarkMode ? '#9CA3AF' : '#6B7280';

  return (
    <SafeAreaView
      className={`flex-1 ${bgClass}`}
      style={{ paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 20) }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeInUp.duration(600).delay(100)}>
            <Text className={`text-4xl font-bold mt-4 tracking-tight leading-tight ${textClass}`}>
              Create Your{"\n"}New Account
            </Text>
          </Animated.View>

          {/* Profile Picture */}
          <Animated.View entering={FadeInDown.duration(600).delay(200)} className="items-center my-8">
            <Pressable
              className="shadow-xl shadow-primary-green/20"
              style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] }]}
            >
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61' }}
                className="h-28 w-28 rounded-full border-4 border-primary-green/30"
              />
              <View className="absolute bottom-0 right-0 bg-primary-green h-10 w-10 rounded-full items-center justify-center border-4 border-background-dark">
                <Text className="text-2xl">📷</Text>
              </View>
            </Pressable>
          </Animated.View>

          {/* Form */}
          <Animated.View entering={FadeInDown.duration(600).delay(300)}>
            <View style={{ rowGap: 16 }}>
              <View className={`rounded-2xl ${inputBgClass} shadow-sm`}>
                <TextInput
                  placeholder="Username"
                  placeholderTextColor={placeholderColor}
                  className={`p-5 text-base ${inputTextClass}`}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>
              <View className={`rounded-2xl ${inputBgClass} shadow-sm`}>
                <TextInput
                  placeholder="Email"
                  placeholderTextColor={placeholderColor}
                  className={`p-5 text-base ${inputTextClass}`}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!loading}
                />
              </View>
              <View className={`rounded-2xl ${inputBgClass} shadow-sm`}>
                <TextInput
                  placeholder="Password"
                  placeholderTextColor={placeholderColor}
                  className={`p-5 text-base ${inputTextClass}`}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!loading}
                />
              </View>
              <View className={`rounded-2xl ${inputBgClass} shadow-sm`}>
                <TextInput
                  placeholder="Confirm Password"
                  placeholderTextColor={placeholderColor}
                  className={`p-5 text-base ${inputTextClass}`}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  editable={!loading}
                />
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(600).delay(400)}>
            <Pressable
              onPress={handleRegister}
              disabled={loading}
              className="bg-primary-green rounded-2xl p-5 mt-10 items-center shadow-xl shadow-primary-green/30 active:scale-98"
              style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text className="text-background-dark font-bold text-lg tracking-wide">CREATE ACCOUNT</Text>
              )}
            </Pressable>
            <View className="flex-row justify-center mt-6">
              <Text className={`text-base ${secondaryTextClass}`}>Already have an account? </Text>
              <Link href="/login"><Text className="text-primary-green font-bold">Login</Text></Link>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}