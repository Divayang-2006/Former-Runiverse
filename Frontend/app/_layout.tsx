import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LogBox, View } from "react-native";
import "./global.css";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { useState, useEffect } from "react";
import ReanimatedSplashScreen from '../components/ReanimatedSplashScreen';
import { usePedometer } from "@/services/pedometerService";
import profileService from "@/services/profileService";
import { authService } from "@/services/AuthService";
import { locationService } from "@/services/locationService";
import { useStore } from "@/store/useStore";
import Toast from "react-native-toast-message";

const STRIDE_M = 0.78;

LogBox.ignoreLogs([
  "You are setting the style",
  "Mapbox [error] ViewTagResolver",
]);

type StoreState = ReturnType<typeof useStore>;

function ActivitySyncBridge() {
  const { totalToday } = usePedometer();
  const updateUser = useStore((s) => s.updateUser);
  const setUser = useStore((s) => s.setUser);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      if (!authService.getToken()) return;
      try {
        const result = await profileService.fetchMe();
        if (!cancelled && result.success && result.data) {
          const current = useStore.getState().user;
          const merged = current ? { ...current, ...result.data } : (result.data as any);
          setUser(merged as any);
        }
      } catch (err) {
        console.log("profile hydrate failed:", err);
      }
    };

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [setUser]);

  useEffect(() => {
    if (!Number.isFinite(totalToday)) return;
    updateUser({
      steps: Math.round(totalToday),
      distance: Math.round(totalToday * STRIDE_M * 100) / 100,
    });
  }, [totalToday, updateUser]);

  useEffect(() => {
    locationService.startAutoSync();
    return () => locationService.stopAutoSync();
  }, []);

  return null;
}

// A separate component to handle the main app content
function AppContent() {
  const { theme } = useTheme();

  return (
    <View className={theme === 'dark' ? "flex-1 bg-background-dark" : "flex-1 bg-white"}>
      <ActivitySyncBridge />
      <>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="edit-profile" />
        </Stack>
        <Toast />
      </>
      <StatusBar style={theme === 'dark' ? "light" : "dark"} />
    </View>
  );
}

export default function RootLayout() {
  const [isAppReady, setIsAppReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        await Promise.all([
          authService.hydrate().catch(() => undefined),
          new Promise((resolve) => setTimeout(resolve, 2500)),
        ]);
      } finally {
        if (!cancelled) {
          setIsAppReady(true);
        }
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        {isAppReady ? <AppContent /> : <ReanimatedSplashScreen />}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}