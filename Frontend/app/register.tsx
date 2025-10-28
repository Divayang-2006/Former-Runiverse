import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';
import CustomInput from '../components/CustomInput';
import { authService } from '../services/AuthService';
import { useStore } from '@/store/useStore';
import profileService from '@/services/profileService';

export default function RegisterScreen() {
  const router = useRouter();
  const setUser = useStore((s) => s.setUser);
  const user = useStore((s) => s.user);
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.replace('/(tabs)');
    }
  }, [user, router]);

  const handleRegister = async () => {
    if (!username || !email || !password) {
      Alert.alert('Validation', 'Username, email & password are required');
      return;
    }
    try {
      setLoading(true);
      const payload = {
        username,
        email,
        password,
        lastName,
        mobileNumber: mobile,
      } as any;

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
    <SafeAreaView className="flex-1 bg-background-dark p-6">
      <Text className="text-text-primary text-3xl font-bold mt-10">
        Create Your{'\n'}New Account
      </Text>

      {/* Profile Picture */}
      <View className="items-center my-8">
        <TouchableOpacity>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61' }}
            className="h-24 w-24 rounded-full"
          />
        </TouchableOpacity>
      </View>

      {/* Form */}
      <CustomInput iconName="account-outline" placeholder="Enter Your Last Name" value={lastName} onChangeText={setLastName} />
      <CustomInput iconName="account-circle-outline" placeholder="Enter Username" value={username} onChangeText={setUsername} />
      <CustomInput iconName="email-outline" placeholder="Enter Email Id" value={email} onChangeText={setEmail} />
      <CustomInput iconName="phone-outline" placeholder="Mobile Number" value={mobile} onChangeText={setMobile} />
      <CustomInput iconName="lock-outline" placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />

      <TouchableOpacity onPress={handleRegister} disabled={loading} className="bg-primary-green rounded-xl p-4 mt-8 items-center">
        {loading ? <ActivityIndicator color="#000" /> : <Text className="text-background-dark font-bold text-lg">NEXT</Text>}
      </TouchableOpacity>
      <View className="flex-row justify-center mt-4">
        <Text className="text-text-secondary">Already have an account? </Text>
        <Link href="/login"><Text className="text-primary-green font-bold">Login</Text></Link>
      </View>
    </SafeAreaView>
  );
}