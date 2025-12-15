import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, FlatList, Image, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";
import { FontAwesome5 } from "@expo/vector-icons";
import { useStore } from "@/store/useStore";
import { leaderboardService, LeaderboardEntry } from "@/services/leaderboardService";

const LeaderboardScreen = () => {
  const { theme } = useTheme();
  const user = useStore((s) => s.user);
  const isDarkMode = theme === "dark";
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const city = user?.city?.trim() || "Gandhinagar";
  const isMountedRef = useRef(true);

  useEffect(() => () => {
    isMountedRef.current = false;
  }, []);

  const fetchLeaderboard = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!city) {
        if (isMountedRef.current) {
          setEntries([]);
          setLoading(false);
          setRefreshing(false);
        }
        return;
      }

      if (mode === "refresh") {
        if (isMountedRef.current) setRefreshing(true);
      } else if (isMountedRef.current) {
        setLoading(true);
      }

      if (isMountedRef.current) setError(null);

      try {
        const data = await leaderboardService.fetchCityLeaderboard(city);
        if (isMountedRef.current) setEntries(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load leaderboard";
        if (isMountedRef.current) setError(message);
      } finally {
        if (!isMountedRef.current) return;
        if (mode === "refresh") setRefreshing(false);
        else setLoading(false);
      }
    },
    [city]
  );

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const bgClass = isDarkMode ? "bg-background-dark" : "bg-gray-100";
  const textClass = isDarkMode ? "text-text-primary" : "text-gray-900";
  const cardBgClass = isDarkMode ? "bg-card-dark" : "bg-white";

  const renderItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const rank = index + 1;
    let rankColor = isDarkMode ? "text-gray-400" : "text-gray-600";
    if (rank === 1) rankColor = "text-yellow-400";
    if (rank === 2) rankColor = "text-gray-300";
    if (rank === 3) rankColor = "text-yellow-600";

    const avatarSource = item.avatarUrl
      ? { uri: item.avatarUrl }
      : { uri: "https://i.pravatar.cc/150?u=runiverse-placeholder" };
    const areaLabel = `${Math.round(item.totalArea).toLocaleString()} m²`;
    const stepsLabel = `${Math.round(item.steps).toLocaleString()} steps`;

    return (
      <View className={`flex-row items-center p-4 rounded-lg mb-2 ${cardBgClass}`}>
        <Text className={`text-xl font-bold w-10 ${rankColor}`}>#{rank}</Text>
        <Image source={avatarSource} className="w-12 h-12 rounded-full mr-4" />
        <View className="flex-1">
          <Text className={`text-lg font-semibold ${textClass}`}>{item.username}</Text>
          <Text className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>{areaLabel}</Text>
        </View>
        <Text className={`text-sm font-semibold text-right ${textClass}`}>{stepsLabel}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView className={`flex-1 ${bgClass}`}>
      <View className="p-6">
        <Text className={`text-3xl font-bold mb-2 ${textClass}`}>Leaderboard</Text>
        <View className="flex-row items-center">
          <FontAwesome5 name="map-marker-alt" size={16} color={isDarkMode ? "#9CA3AF" : "#4B5563"} />
          <Text className={`ml-2 text-base ${isDarkMode ? "text-text-secondary" : "text-gray-600"}`}>{city}</Text>
        </View>
        {error && <Text className="mt-3 text-sm text-red-400">{error}</Text>}
      </View>

      {loading && entries.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={isDarkMode ? "#60A5FA" : "#2563EB"} />
        </View>
      ) : (
        <FlatList
          data={entries}
          renderItem={renderItem}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          refreshing={refreshing}
          onRefresh={() => fetchLeaderboard("refresh")}
          ListEmptyComponent={
            !loading ? (
              <View className="items-center justify-center py-20">
                <FontAwesome5 name="users" size={36} color={isDarkMode ? "#4B5563" : "#9CA3AF"} />
                <Text className={`mt-3 text-base ${isDarkMode ? "text-text-secondary" : "text-gray-600"}`}>
                  No players tracked in this city yet.
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
};

export default LeaderboardScreen;