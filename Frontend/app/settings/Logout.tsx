import React, { useState } from "react";
import { Alert, Switch, Text, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { authService } from "@/services/AuthService";
import { useStore } from "@/store/useStore";
import { useTheme } from "../../context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

export default function Logout() {
  const { theme } = useTheme();
  const router = useRouter();
  const setUser = useStore((s) => s.setUser);
  const clearActivities = useStore((s) => s.clearActivities);
  const user = useStore((s) => s.user);
  const isDarkMode = theme === "dark";

  const [rememberLogin, setRememberLogin] = useState(true);

  const bgClass = isDarkMode ? "bg-background-dark" : "bg-gray-100";
  const textClass = isDarkMode ? "text-text-primary" : "text-gray-900";
  const cardBgClass = isDarkMode ? "bg-card-dark" : "bg-white";
  const subtleText = isDarkMode ? "text-gray-400" : "text-gray-600";

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await authService.logout();
            setUser(null);
            clearActivities();
            router.replace("/login");
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView className={`flex-1 ${bgClass}`}>
      <View className="flex-1 px-6 pt-6">
        <View className="flex-row items-center mb-6">
          <Pressable onPress={() => router.back()} className="mr-4 p-2 -ml-2">
            <Ionicons name="arrow-back" size={28} color={isDarkMode ? "white" : "black"} />
          </Pressable>
          <Text className={`text-3xl font-bold ${textClass} tracking-tight`}>Logout</Text>
        </View>

        <Animated.View entering={FadeInDown.duration(600).delay(100)} className={`rounded-3xl p-6 mb-6 shadow-lg ${cardBgClass}`}>
          <View className="flex-row items-center mb-6">
            <View className="bg-blue-500/10 p-3 rounded-2xl mr-3">
              <Ionicons name="person-circle" size={24} color="#3B82F6" />
            </View>
            <View className="flex-1">
              <Text className={`text-lg font-bold ${textClass}`}>{user?.username || "User"}</Text>
              <Text className={subtleText}>{user?.email || "user@runiverse.app"}</Text>
            </View>
          </View>

          <View className="py-4 border-t border-gray-200 dark:border-gray-700">
            <View className="flex-row justify-between items-center">
              <View className="flex-1 mr-4">
                <Text className={`text-base font-medium ${textClass}`}>Remember Login</Text>
                <Text className={`text-sm mt-1 ${subtleText}`}>Stay signed in on this device</Text>
              </View>
              <Switch 
                value={rememberLogin} 
                onValueChange={setRememberLogin}
                trackColor={{ false: "#767577", true: "#6A5ACD" }}
                thumbColor={rememberLogin ? "#00C853" : "#f4f3f4"}
              />
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(200)} className={`rounded-3xl p-6 shadow-lg ${cardBgClass}`}>
          <View className="flex-row items-center mb-4">
            <View className="bg-red-500/10 p-3 rounded-2xl mr-3">
              <Ionicons name="log-out" size={24} color="#EF4444" />
            </View>
            <Text className={`text-xl font-bold ${textClass}`}>Sign Out</Text>
          </View>

          <Text className={`text-sm mb-6 ${subtleText}`}>
            You can always sign back in anytime. Your data and progress will be saved.
          </Text>

          <Pressable
            onPress={handleLogout}
            className="active:scale-95"
            style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
          >
            <LinearGradient
              colors={['#EF4444', '#DC2626']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="py-4 rounded-xl items-center"
            >
              <View className="flex-row items-center">
                <Ionicons name="log-out-outline" size={20} color="white" />
                <Text className="text-white font-bold text-base tracking-wide ml-2">
                  Logout
                </Text>
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(300)} className="mt-8 items-center">
          <Text className={`text-xs ${subtleText} text-center`}>
            Logging out will not delete your account or any data.{'\n'}
            All your progress will be safely stored.
          </Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

