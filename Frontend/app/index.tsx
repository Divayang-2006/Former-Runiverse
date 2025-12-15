import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { authService } from "@/services/AuthService";
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

// Provide a fallback demo video URL if env not set. Replace with your own.
// const VIDEO_URL = process.env.EXPO_PUBLIC_WELCOME_VIDEO_URL || 'https://static-assets.mapbox.com/www/videos/mobile-maps-sdk/section_hero/video@720p.webm';
const VIDEO_URL = 'https://drive.google.com/uc?export=download&id=1Z1CW9f6LJ3wJ8xJY4fdodDxTRvEAzjp7';

export default function WelcomeScreen() {
  const { isDark, colors } = useTheme();
  const isDarkMode = isDark;
  const videoRef = useRef<Video | null>(null);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        await authService.hydrate();
        const token = authService.getToken();
        if (token && isMounted) {
          router.replace("/(tabs)");
        }
      } catch (err) {
        console.warn("Auth check failed:", err);
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background.primary }}>
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
          colors={isDarkMode ? [colors.overlay.scrim, colors.overlay.subtle, '#000000'] : [colors.overlay.scrim, colors.overlay.subtle, '#0A0A0A']}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents='none' style={styles.vignette} />

        {/* Content */}
        <View className="flex-1 p-6 justify-end">
          <Animated.View 
            entering={FadeInUp.duration(800).delay(200)}
            className="mb-12" 
            style={{ gap: 14 }}
          >
            <Text className="text-5xl font-bold leading-tight tracking-tight" style={{ color: colors.text.primary }}>
              Run. Conquer.
              {"\n"}Own Your World.
            </Text>
            <Text className="text-lg leading-relaxed" style={{ color: colors.text.secondary }}>
              Transform every step into progress. Capture territory, climb leaderboards and grow stronger with the community that runs the Runiverse.
            </Text>
            <Text className="text-xs uppercase tracking-widest font-medium" style={{ color: colors.text.tertiary }}>
              Seamless tracking • Territory strategy • Social motivation
            </Text>
          </Animated.View>

          {/* Progress indicators + CTA */}
          <Animated.View 
            entering={FadeInDown.duration(600).delay(400)}
            className="flex-row justify-between items-center mb-2"
          >
            <View className="flex-row items-center" style={{ gap: 6 }}>
              <View
                className="h-2 w-8 rounded-full"
                style={{ backgroundColor: colors.accent.primary, shadowColor: colors.accent.primary, shadowOpacity: 0.35, shadowRadius: 6 }}
              />
              <View className="h-2 w-2 rounded-full" style={{ backgroundColor: colors.text.tertiary + '80' }} />
              <View className="h-2 w-2 rounded-full" style={{ backgroundColor: colors.text.tertiary + '55' }} />
            </View>
            <Pressable 
              onPress={() => router.push('/login')}
              className="h-16 w-16 rounded-full items-center justify-center active:scale-95"
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                  backgroundColor: colors.accent.primary,
                  shadowColor: colors.accent.primary,
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                },
              ]}
            >
              <FontAwesome name="arrow-right" size={26} color={isDarkMode ? colors.text.primary : '#FFFFFF'} />
            </Pressable>
          </Animated.View>
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