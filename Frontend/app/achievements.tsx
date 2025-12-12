import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "../context/ThemeContext";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { useStore } from "@/store/useStore";
import { authService } from "@/services/AuthService";
import {
  Task,
  TASK_TYPE_ICON,
  METRIC_CONFIG,
} from "./(tabs)/challenges";

const API_BASE_URL = "https://runiverse.onrender.com/api";

type CompletedTask = Task & {
  updatedAt?: string;
  completedAt?: string;
};

const formatDate = (value?: string | Date | null) => {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
};

const AchievementsScreen = () => {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const user = useStore((s) => s.user);
  const token = user?.token ?? authService.getToken();
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAchievements = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!token) {
        setCompletedTasks([]);
        return;
      }

      if (!options?.silent) {
        setLoading(true);
      }

      try {
        const res = await fetch(`${API_BASE_URL}/tasks`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.msg || "Failed to load achievements");
        }
        const payload: CompletedTask[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.tasks)
          ? data.tasks
          : [];
        const done = payload.filter((task) => task.completed);
        setCompletedTasks(done);
      } catch (err) {
        console.error("Fetch achievements error:", err);
        Toast.show({
          type: "error",
          text1: "Unable to load achievements",
          text2: err instanceof Error ? err.message : "Please try again shortly.",
          position: "bottom",
        });
      } finally {
        if (!options?.silent) {
          setLoading(false);
        }
      }
    },
    [token]
  );

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await fetchAchievements({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [fetchAchievements, refreshing]);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  const summary = useMemo(() => {
    if (!completedTasks.length) {
      return {
        total: 0,
        lastCompleted: null as Date | null,
        favoriteType: null as Task["type"] | null,
      };
    }

    let latestTimestamp = 0;
    const typeCounts: Partial<Record<Task["type"], number>> = {};

    completedTasks.forEach((task) => {
      const timestamp = new Date(task.updatedAt ?? task.completedAt ?? task.createdAt).getTime();
      if (!Number.isNaN(timestamp) && timestamp > latestTimestamp) {
        latestTimestamp = timestamp;
      }
      typeCounts[task.type] = (typeCounts[task.type] || 0) + 1;
    });

    const favoriteType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as Task["type"] | undefined;

    return {
      total: completedTasks.length,
      lastCompleted: latestTimestamp ? new Date(latestTimestamp) : null,
      favoriteType: favoriteType ?? null,
    };
  }, [completedTasks]);

  const heroPrimaryColor = isDark ? "#F8FAFC" : "#052C45";
  const heroSecondaryColor = isDark ? "rgba(255,255,255,0.75)" : "rgba(3, 18, 31, 0.7)";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 36, paddingHorizontal: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center justify-between pt-4 mb-6">
          <Pressable
            onPress={() => router.back()}
            className="w-11 h-11 rounded-2xl items-center justify-center"
            style={{
              backgroundColor: isDark ? colors.background.tertiary : colors.background.secondary,
              borderWidth: 1,
              borderColor: colors.border.light,
            }}
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={colors.text.primary}
            />
          </Pressable>
          <Text className="text-2xl font-bold" style={{ color: colors.text.primary }}>
            Achievements
          </Text>
          <View style={{ width: 44 }} />
        </View>

        <Animated.View entering={FadeInDown.duration(600).delay(50)} className="mb-6">
          <LinearGradient
            colors={isDark ? colors.gradients.berryBlend : colors.gradients.oceanBreeze}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 32, padding: 24 }}
          >
            <Text className="text-sm uppercase tracking-widest mb-2" style={{ color: heroSecondaryColor }}>
              Lifetime progress
            </Text>
            <Text className="text-4xl font-black mb-3" style={{ color: heroPrimaryColor }}>
              {summary.total} {summary.total === 1 ? "Win" : "Wins"}
            </Text>
            <Text className="text-base mb-6" style={{ color: heroSecondaryColor }}>
              {summary.total > 0
                ? `Last badge unlocked on ${formatDate(summary.lastCompleted)}`
                : "Complete a challenge to earn your first badge."}
            </Text>
            <View className="flex-row">
              <View className="flex-1 pr-3">
                <Text className="text-xs uppercase tracking-wide mb-1" style={{ color: heroSecondaryColor }}>
                  Favorite focus
                </Text>
                <Text className="text-xl font-semibold" style={{ color: heroPrimaryColor }}>
                  {summary.favoriteType
                    ? summary.favoriteType.charAt(0).toUpperCase() + summary.favoriteType.slice(1)
                    : "—"}
                </Text>
              </View>
              <View className="w-px bg-white/40 mx-1" />
              <View className="flex-1 pl-3">
                <Text className="text-xs uppercase tracking-wide mb-1" style={{ color: heroSecondaryColor }}>
                  Active streak
                </Text>
                <Text className="text-xl font-semibold" style={{ color: heroPrimaryColor }}>
                  {user?.streak ?? 0} days
                </Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {loading && completedTasks.length === 0 ? (
          <View className="items-center justify-center py-20">
            <ActivityIndicator size="large" color={colors.accent.primary} />
            <Text className="mt-4" style={{ color: colors.text.secondary }}>
              Fetching your victories...
            </Text>
          </View>
        ) : completedTasks.length === 0 ? (
          <Animated.View entering={FadeInDown.duration(600).delay(150)} className="items-center py-24">
            <Text className="text-6xl mb-4">🏅</Text>
            <Text className="text-xl font-semibold" style={{ color: colors.text.primary }}>
              No achievements yet
            </Text>
            <Text className="mt-2 text-center px-4" style={{ color: colors.text.secondary }}>
              Complete a challenge to unlock your first milestone.
            </Text>
          </Animated.View>
        ) : (
          completedTasks.map((task, idx) => (
            <AchievementCard key={task._id} index={idx} task={task} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

interface AchievementCardProps {
  task: CompletedTask;
  index: number;
}

const AchievementCard = ({ task, index }: AchievementCardProps) => {
  const { colors, isDark } = useTheme();
  const config = METRIC_CONFIG[task.type];
  const difficultyPalette: Record<Task["difficulty"], string> = {
    easy: colors.status.success,
    medium: colors.status.warning,
    hard: colors.status.error,
  };
  const targetLabel = config
    ? `${config.formatTarget(task.target)} ${config.unitLabel}`
    : `${task.target}`;
  const iconName = TASK_TYPE_ICON[task.type] || "running";
  const difficultyColor = difficultyPalette[task.difficulty] || colors.accent.primary;
  const completedDate = formatDate(task.updatedAt ?? task.completedAt ?? task.createdAt);

  return (
    <Animated.View
      entering={FadeInDown.duration(500).delay(150 + index * 40)}
      className="mb-4"
      style={{
        borderRadius: 28,
        padding: 20,
        borderWidth: 1,
        backgroundColor: colors.background.elevated,
        borderColor: isDark ? colors.border.medium : colors.border.light,
        shadowColor: isDark ? "rgba(0,0,0,0.45)" : "rgba(15,23,42,0.08)",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 6,
      }}
    >
      <View className="flex-row items-center mb-4">
        <View
          className="w-14 h-14 rounded-2xl items-center justify-center mr-4"
          style={{ backgroundColor: `${difficultyColor}1A` }}
        >
          <FontAwesome5 name={iconName} size={22} color={difficultyColor} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold" style={{ color: colors.text.primary }}>
            {task.description}
          </Text>
          <Text className="text-sm mt-1" style={{ color: colors.text.secondary }}>
            Finished on {completedDate}
          </Text>
        </View>
      </View>
      <View className="flex-row flex-wrap gap-2">
        <View className="px-3 py-1.5 rounded-full" style={{ backgroundColor: isDark ? colors.background.tertiary : colors.background.secondary }}>
          <Text className="text-xs font-semibold" style={{ color: colors.text.secondary }}>
            🎯 Target · {targetLabel}
          </Text>
        </View>
        <View className="px-3 py-1.5 rounded-full" style={{ backgroundColor: `${difficultyColor}12` }}>
          <Text className="text-xs font-semibold" style={{ color: difficultyColor }}>
            ⚙️ {task.difficulty.toUpperCase()}
          </Text>
        </View>
        <View className="px-3 py-1.5 rounded-full" style={{ backgroundColor: isDark ? colors.background.tertiary : colors.background.secondary }}>
          <Text className="text-xs font-semibold" style={{ color: colors.text.secondary }}>
            🏁 Type · {task.type.toUpperCase()}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

export default AchievementsScreen;
