import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Image, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';
import CustomInput from '../components/CustomInput';
import { authService } from '../services/AuthService';
import { useStore } from '@/store/useStore';
import { profileService } from '@/services/profileService';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

export default function RegisterScreen() {
  const router = useRouter();
  const setUser = useStore((s) => s.setUser);
  const user = useStore((s) => s.user);
  const insets = useSafeAreaInsets();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.replace('/(tabs)');
    }
  }, [user, router]);

  const handleRegister = async () => {
    if (!username.trim() || !email.trim() || !password) {
      Alert.alert('Validation', 'Username, email & password are required');
      return;
    }
    try {
      setLoading(true);
      const payload = {
        username: username.trim(),
        email: email.trim(),
        password,
      };

      const result = await authService.register(payload);

      if (result.success && result.token) {
        // Auto-login after successful registration
        let normalizedUser: any = null;

        if (result.user) {
          normalizedUser = {
            ...result.user,
            id: result.user._id || result.user.id,
            avatarUrl: result.user.avatar || result.user.avatarUrl || null,
          };
        }

        if (displayName.trim().length > 0) {
          try {
            const profileResult = await profileService.updateUserProfile({ displayName: displayName.trim() });
            if (profileResult.success && profileResult.data) {
              normalizedUser = {
                ...(normalizedUser || {}),
                ...profileResult.data,
              };
            }
          } catch (profileError) {
            console.warn('Optional profile update failed:', profileError);
          }
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

        if (normalizedUser) {
          setUser(normalizedUser as any);
        }

        Alert.alert('✅ Success', result.message || 'Account created successfully!', [
          { text: 'Continue', onPress: () => router.replace('/(tabs)') },
        ]);
      } else {
        Alert.alert('❌ Error', result.message || 'Registration failed');
      }
    } catch (e: any) {
      Alert.alert('❌ Error', e?.message || 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      className="flex-1 bg-background-dark"
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
            <Text className="text-text-primary text-4xl font-bold mt-4 tracking-tight leading-tight">
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
          <Animated.View entering={FadeInDown.duration(600).delay(300)} style={{ gap: 12 }}>
            <CustomInput iconName="account-outline" placeholder="Display Name (optional)" value={displayName} onChangeText={setDisplayName} />
            <CustomInput iconName="account-circle-outline" placeholder="Enter Username" value={username} onChangeText={setUsername} />
            <CustomInput iconName="email-outline" placeholder="Enter Email" value={email} onChangeText={setEmail} />
            <CustomInput iconName="lock-outline" placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
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
              <Text className="text-text-secondary">Already have an account? </Text>
              <Link href="/login"><Text className="text-primary-green font-bold">Login</Text></Link>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}