import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef, useEffect, useState } from 'react';
import { authService } from '@/services/AuthService';
import { useStore } from '@/store/useStore';
import profileService from '@/services/profileService';

// Provide a fallback demo video URL if env not set. Replace with your own.
// const VIDEO_URL = process.env.EXPO_PUBLIC_WELCOME_VIDEO_URL || 'https://static-assets.mapbox.com/www/videos/mobile-maps-sdk/section_hero/video@720p.webm';
const VIDEO_URL = 'https://drive.google.com/uc?export=download&id=1Z1CW9f6LJ3wJ8xJY4fdodDxTRvEAzjp7';

export default function WelcomeScreen() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const videoRef = useRef<Video | null>(null);
  const router = useRouter();
  const setUser = useStore((s) => s.setUser);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      try {
        await authService.hydrate();
        const token = authService.getToken();

        if (!cancelled && token) {
          // Token exists, try to fetch user profile
          const result = await profileService.fetchMe();
          if (!cancelled && result.success && result.data) {
            setUser(result.data as any);
            router.replace('/(tabs)');
            return;
          }
        }
      } catch (err) {
        console.log('Auto-login check failed:', err);
      } finally {
        if (!cancelled) {
          setIsChecking(false);
        }
      }
    };

    checkAuth();

    return () => {
      cancelled = true;
    };
  }, [router, setUser]);

  if (isChecking) {
    return (
      <SafeAreaView className={isDarkMode ? 'flex-1 bg-background-dark' : 'flex-1 bg-black'}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#00e0ff" />
          <Text className="text-gray-400 mt-4">Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={isDarkMode ? 'flex-1 bg-background-dark' : 'flex-1 bg-black'}>
      <View className="flex-1">
        {/* Background Video */}
        <Video
          ref={videoRef}
          source={{ uri: VIDEO_URL }}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping
          isMuted
          onError={(e) => console.warn('Video error', e)}
        />

        {/* Darken + vignette overlays */}
        <LinearGradient
          colors={[ 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.40)', 'rgba(0,0,0,1)' ]}
          locations={[0,0.55,1]}
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents='none' style={styles.vignette} />

        {/* Content */}
        <View className="flex-1 p-6 justify-end">
          <View className="mb-12" style={{ gap: 14 }}>
            <Text className="text-4xl font-bold text-gray-300 leading-tight">
              Run. Conquer.
              {"\n"}Own Your World.
            </Text>
            <Text className="text-base text-gray-400">
              Transform every step into progress. Capture territory, climb leaderboards and grow stronger with the community that runs the Runiverse.
            </Text>
            <Text className="text-xs uppercase tracking-widest text-gray-500">
              Seamless tracking • Territory strategy • Social motivation
            </Text>
          </View>

          {/* Progress indicators + CTA */}
          <View className="flex-row justify-between items-center mb-2">
            <View className="flex-row items-center" style={{ gap: 6 }}>
              <View className="h-2 w-6 bg-primary-green rounded-full" />
              <View className="h-2 w-2 bg-neutral-500/60 rounded-full" />
              <View className="h-2 w-2 bg-neutral-500/40 rounded-full" />
            </View>
            <TouchableOpacity 
              onPress={() => router.push('/login')}
              className="bg-primary-green h-16 w-16 rounded-full items-center justify-center shadow-lg shadow-black/40"
            >
              <FontAwesome name="arrow-right" size={24} color="black" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  vignette: {
    ...StyleSheet.absoluteFillObject,
    // radial-ish vignette using multiple shadows / gradient fallback (web/platform differences)
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.9,
    shadowRadius: 50,
  }
});