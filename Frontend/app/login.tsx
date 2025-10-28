import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../services/AuthService';
import { useStore } from '@/store/useStore';
import { profileService } from '@/services/profileService';

const LoginScreen = () => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const router = useRouter();
  const setUser = useStore((s) => s.setUser);
  const user = useStore((s) => s.user);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.replace('/(tabs)');
    }
  }, [user, router]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing Info', 'Email and password are required');
      return;
    }

    setLoading(true);

    try {
      const result = await authService.login(email, password);

      if (result.success && result.token) {
        let normalizedUser: any = null;

        if (result.user) {
          normalizedUser = {
            ...result.user,
            id: result.user._id || result.user.id,
            avatarUrl: result.user.avatar || result.user.avatarUrl || null,
          };
        }

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
          <TouchableOpacity className="p-2 self-start" disabled={loading}>
            <Ionicons name="arrow-back" size={28} color={iconColor} />
          </TouchableOpacity>
        </Link>
      </View>

      <View className="flex-1 justify-center p-6">
        <Text className={`text-4xl font-bold mb-2 ${textClass}`}>Welcome Back!</Text>
        <Text className={`text-lg mb-8 ${secondaryTextClass}`}>Log in to continue your journey.</Text>

        <View className={`rounded-xl mb-4 ${inputBgClass}`}>
          <TextInput
            placeholder="Email Address"
            placeholderTextColor={isDarkMode ? '#A9A9A9' : '#6B7280'}
            className={`p-4 text-base ${inputTextClass}`}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            editable={!loading}
          />
        </View>

        <View className={`rounded-xl mb-6 ${inputBgClass}`}>
          <TextInput
            placeholder="Password"
            placeholderTextColor={isDarkMode ? '#A9A9A9' : '#6B7280'}
            className={`p-4 text-base ${inputTextClass}`}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!loading}
          />
        </View>

        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          className="bg-primary-green p-4 rounded-xl items-center justify-center shadow-md"
        >
          {loading ? <ActivityIndicator color="#000" /> : <Text className="text-black text-lg font-bold">Log In</Text>}
        </TouchableOpacity>

        <View className="flex-row justify-center mt-6">
          <Text className={`text-base ${secondaryTextClass}`}>Don't have an account? </Text>
          <Link href="/register">
            <Text className="text-primary-green font-bold text-base">Sign Up</Text>
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default LoginScreen;