import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, { FadeInDown, FadeOutDown, Layout } from "react-native-reanimated";
import { Activity, Flag, Flame, Footprints, Trophy, Trash2 } from "lucide-react-native";
import { useTheme } from "@/context/ThemeContext";
import { authService } from "@/services/AuthService";
import { GlassCard } from "@/components/ui/GlassCard";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { User } from "@/store/types";
import { useStore } from "@/store/useStore";

export interface Task {
  _id: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  type: 'run' | 'walk' | 'capture' | 'streak';
  target: number;
  completed: boolean;
  createdAt: string;
  expiresAt?: string;
}
const API_BASE_URL = "https://runiverse.onrender.com/api";

const PROGRESS_STORAGE_KEY = "challenge-progress-map-v1";
const DAILY_GOALS_STORAGE_KEY = "daily-goals-v1";

interface DailyGoal {
  distance: number;
  steps: number;
  territories: number;
}

interface DailyProgress {
  date: string;
  startDistance: number;
  startSteps: number;
  startTerritories: number;
}

interface ProgressEntry {
  joined: boolean;
  baselineRaw: number;
  metric: Task["type"];
  progressValue: number;
  percent: number;
  completed: boolean;
  completionSynced: boolean;
}

interface MetricConfig {
  unitLabel: string;
  selector: (user: User | null) => number;
  computeDelta: (current: number, baseline: number) => number;
  formatValue: (value: number) => string;
  formatTarget: (target: number) => string;
  canTrack: (user: User | null) => boolean;
}

export const trimTrailingZeros = (value: string) => value.replace(/\.0+$/, "").replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.$/, "");

export const distanceFormatter = (value: number) => {
  if (!Number.isFinite(value)) return "0";
  const absolute = Math.max(0, value);
  if (absolute >= 10) return trimTrailingZeros(absolute.toFixed(1));
  if (absolute >= 1) return trimTrailingZeros(absolute.toFixed(2));
  return trimTrailingZeros(absolute.toFixed(3));
};

export const integerFormatter = (value: number) => {
  if (!Number.isFinite(value)) return "0";
  return Math.max(0, Math.round(value)).toString();
};

export const METRIC_CONFIG: Record<Task["type"], MetricConfig> = {
  run: {
    unitLabel: "km",
    selector: (user) => (typeof user?.distance === "number" ? user.distance : 0),
    computeDelta: (current, baseline) => {
      const safeCurrent = Number.isFinite(current) ? current : 0;
      const safeBaseline = Number.isFinite(baseline) ? baseline : 0;
      return Math.max(0, (safeCurrent - safeBaseline) / 1000);
    },
    formatValue: distanceFormatter,
    formatTarget: distanceFormatter,
    canTrack: (user) => typeof user?.distance === "number",
  },
  walk: {
    unitLabel: "km",
    selector: (user) => (typeof user?.distance === "number" ? user.distance : 0),
    computeDelta: (current, baseline) => {
      const safeCurrent = Number.isFinite(current) ? current : 0;
      const safeBaseline = Number.isFinite(baseline) ? baseline : 0;
      return Math.max(0, (safeCurrent - safeBaseline) / 1000);
    },
    formatValue: distanceFormatter,
    formatTarget: distanceFormatter,
    canTrack: (user) => typeof user?.distance === "number",
  },
  capture: {
    unitLabel: "territories",
    selector: (user) => (typeof user?.territories === "number" ? user.territories : 0),
    computeDelta: (current, baseline) => {
      const safeCurrent = Number.isFinite(current) ? current : 0;
      const safeBaseline = Number.isFinite(baseline) ? baseline : 0;
      return Math.max(0, safeCurrent - safeBaseline);
    },
    formatValue: integerFormatter,
    formatTarget: integerFormatter,
    canTrack: (user) => typeof user?.territories === "number",
  },
  streak: {
    unitLabel: "days",
    selector: (user) => (typeof user?.streak === "number" ? user.streak : 0),
    computeDelta: (current, baseline) => {
      const safeCurrent = Number.isFinite(current) ? current : 0;
      const safeBaseline = Number.isFinite(baseline) ? baseline : 0;
      return Math.max(0, safeCurrent - safeBaseline);
    },
    formatValue: integerFormatter,
    formatTarget: integerFormatter,
    canTrack: (user) => typeof user?.streak === "number",
  },
};

export const TASK_TYPE_ICON: Record<
  Task["type"],
  React.ComponentType<{ size?: number; color?: string }>
> = {
  run: Activity,
  walk: Footprints,
  capture: Flag,
  streak: Flame,
};

const ChallengesScreen = () => {
  const { colors, isDark } = useTheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [progressMap, setProgressMap] = useState<Record<string, ProgressEntry>>({});
  const [progressHydrated, setProgressHydrated] = useState(false);
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [dailyGoals, setDailyGoals] = useState<DailyGoal>({ distance: 5000, steps: 10000, territories: 3 });
  const [dailyProgress, setDailyProgress] = useState<DailyProgress | null>(null);
  const [showGoalEditor, setShowGoalEditor] = useState(false);
  const completionInFlight = useRef<Set<string>>(new Set());
  const autoJoinQueue = useRef<Map<string, Task>>(new Map());
  const user = useStore((s) => s.user);
  const token = user?.token ?? authService.getToken();

  const difficultyColors: Record<Task["difficulty"], string> = {
    easy: colors.status.success,
    medium: colors.status.warning,
    hard: colors.status.error,
  };

  const ensureSyncingState = useCallback((taskId: string, syncing: boolean) => {
    setSyncingIds((prev) => {
      const next = new Set(prev);
      if (syncing) {
        next.add(taskId);
      } else {
        next.delete(taskId);
      }
      return next;
    });
  }, []);

  const joinChallenge = useCallback(
    (task: Task, options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      const notify = (payload: Parameters<typeof Toast.show>[0]) => {
        if (!silent) {
          Toast.show(payload);
        }
      };

      if (!progressHydrated) {
        notify({
          type: "info",
          text1: "Almost ready",
          text2: "Loading your challenge progress...",
          position: "bottom",
        });
        return false;
      }

      if (task.completed) {
        notify({
          type: "info",
          text1: "Already completed",
          text2: "You have already finished this challenge!",
          position: "bottom",
        });
        return false;
      }

      if (!token) {
        notify({
          type: "info",
          text1: "Sign in required",
          text2: "Log in to join challenges.",
          position: "bottom",
        });
        return false;
      }

      const config = METRIC_CONFIG[task.type];
      if (!config) {
        notify({
          type: "info",
          text1: "Unsupported challenge",
          text2: "This challenge type isn't trackable yet.",
          position: "bottom",
        });
        return false;
      }

      if (!config.canTrack(user ?? null)) {
        notify({
          type: "info",
          text1: "Tracking unavailable",
          text2: "Connect your activity tracker to join.",
          position: "bottom",
        });
        return false;
      }

      const baselineRaw = config.selector(user ?? null);
      let joined = false;
      let alreadyJoined = false;

      setProgressMap((prev) => {
        const existing = prev[task._id];
        if (existing?.joined) {
          alreadyJoined = true;
          return prev;
        }

        joined = true;

        return {
          ...prev,
          [task._id]: {
            joined: true,
            baselineRaw,
            metric: task.type,
            progressValue: 0,
            percent: 0,
            completed: false,
            completionSynced: false,
          },
        };
      });

      if (joined && !silent) {
        Toast.show({
          type: "success",
          text1: "Challenge joined",
          text2: "Track your activity to complete it.",
          position: "bottom",
        });
      }

      return joined || alreadyJoined;
    },
    [progressHydrated, token, user]
  );

  const enqueueAutoJoin = useCallback(
    (task: Task) => {
      const joined = joinChallenge(task, { silent: true });
      if (!joined) {
        autoJoinQueue.current.set(task._id, task);
      }
    },
    [joinChallenge]
  );

  useEffect(() => {
    let cancelled = false;

    const hydrateProgress = async () => {
      try {
        const raw = await AsyncStorage.getItem(PROGRESS_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as Record<string, Partial<ProgressEntry & { metric: string }>>;
        if (parsed && typeof parsed === "object" && !cancelled) {
          const sanitized: Record<string, ProgressEntry> = {};
          Object.entries(parsed).forEach(([taskId, entry]) => {
            if (!entry || typeof entry !== "object") return;
            const metric = entry.metric;
            if (metric !== "run" && metric !== "walk" && metric !== "capture" && metric !== "streak") return;
            sanitized[taskId] = {
              joined: Boolean(entry.joined),
              baselineRaw: Number(entry.baselineRaw) || 0,
              metric,
              progressValue: Number(entry.progressValue) || 0,
              percent: Number(entry.percent) || 0,
              completed: Boolean(entry.completed),
              completionSynced: Boolean(entry.completionSynced),
            };
          });
          setProgressMap(sanitized);
        }
      } catch (err) {
        console.log("hydrate progress failed:", err);
      } finally {
        if (!cancelled) {
          setProgressHydrated(true);
        }
      }
    };

    hydrateProgress();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!progressHydrated) return;
    AsyncStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progressMap)).catch((err) => {
      console.log("persist progress failed:", err);
    });
  }, [progressMap, progressHydrated]);

  useEffect(() => {
    const loadDailyGoals = async () => {
      try {
        const goalsRaw = await AsyncStorage.getItem(DAILY_GOALS_STORAGE_KEY);
        if (goalsRaw) {
          const saved = JSON.parse(goalsRaw);
          if (saved.goals) setDailyGoals(saved.goals);
          if (saved.progress) {
            const today = new Date().toDateString();
            if (saved.progress.date === today) {
              setDailyProgress(saved.progress);
            } else {
              const newProgress: DailyProgress = {
                date: today,
                startDistance: user?.distance ?? 0,
                startSteps: user?.steps ?? 0,
                startTerritories: user?.territories ?? 0,
              };
              setDailyProgress(newProgress);
            }
          }
        } else {
          const today = new Date().toDateString();
          setDailyProgress({
            date: today,
            startDistance: user?.distance ?? 0,
            startSteps: user?.steps ?? 0,
            startTerritories: user?.territories ?? 0,
          });
        }
      } catch (err) {
        console.log("load daily goals failed:", err);
      }
    };
    loadDailyGoals();
  }, [user]);

  useEffect(() => {
    if (!dailyProgress) return;
    AsyncStorage.setItem(
      DAILY_GOALS_STORAGE_KEY,
      JSON.stringify({ goals: dailyGoals, progress: dailyProgress })
    ).catch((err) => console.log("persist daily goals failed:", err));
  }, [dailyGoals, dailyProgress]);

  useEffect(() => {
    const refreshInterval = setInterval(() => {
      if (!progressHydrated || !user) return;
      
      setProgressMap((prev) => {
        let changed = false;
        const next: Record<string, ProgressEntry> = { ...prev };
        const taskById = new Map(tasks.map((task) => [task._id, task]));

        Object.keys(next).forEach((taskId) => {
          if (!taskById.has(taskId)) {
            delete next[taskId];
            changed = true;
          }
        });

        tasks.forEach((task) => {
          const config = METRIC_CONFIG[task.type];
          if (!config) return;

          const existing = next[task._id];
          if (!existing || !existing.joined || task.completed) return;

          const currentRaw = config.selector(user);
          const delta = config.computeDelta(currentRaw, existing.baselineRaw);
          const safeDelta = Number.isFinite(delta) ? Math.max(0, delta) : 0;
          const clampedValue = task.target > 0 ? Math.min(safeDelta, task.target) : safeDelta;
          const percent = task.target > 0 ? Math.min(100, Math.round((clampedValue / task.target) * 100)) : 100;
          const completed = safeDelta >= task.target;

          if (
            existing.progressValue !== clampedValue ||
            existing.percent !== percent ||
            existing.completed !== completed
          ) {
            next[task._id] = {
              ...existing,
              progressValue: clampedValue,
              percent,
              completed,
            };
            changed = true;
          }
        });

        return changed ? next : prev;
      });
    }, 5000);

    return () => clearInterval(refreshInterval);
  }, [tasks, user, progressHydrated]);

  // Fetch user's tasks from backend
  const fetchTasks = useCallback(async () => {
    if (!token) {
      setTasks([]);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/tasks`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.msg || "Failed to fetch challenges");
      }
      const payload = Array.isArray(data) ? data : data.tasks;
      setTasks(Array.isArray(payload) ? (payload as Task[]) : []);
    } catch (err) {
      console.error("Fetch tasks error:", err);
      Toast.show({
        type: "error",
        text1: "Unable to load challenges",
        text2: err instanceof Error ? err.message : "Please try again later.",
        position: "bottom",
      });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const generateAITask = useCallback(async () => {
    if (!token) {
      Toast.show({
        type: "info",
        text1: "Sign in required",
        text2: "Log in to generate personalized challenges.",
        position: "bottom",
      });
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/tasks/generate-ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recentDistance: 4.5,
          streakDays: 3,
          avgSpeed: 7.2,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.msg || "Failed to create AI challenge");
      }
      if (data.task) {
        setTasks((prev) => [data.task, ...prev]);
        enqueueAutoJoin(data.task);
      }
    } catch (err) {
      console.error("Generate AI task error:", err);
      Toast.show({
        type: "error",
        text1: "Challenge generation failed",
        text2: err instanceof Error ? err.message : "Please try again in a moment.",
        position: "bottom",
      });
    } finally {
      setLoading(false);
    }
  }, [token, enqueueAutoJoin]);

  const deleteChallenge = useCallback(async (taskId: string) => {
    if (!token) {
      Toast.show({
        type: "info",
        text1: "Sign in required",
        text2: "Log in to delete challenges.",
        position: "bottom",
      });
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.msg || "Failed to delete challenge");
      }

      setTasks((prev) => prev.filter((t) => t._id !== taskId));
      setProgressMap((prev) => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });

      Toast.show({
        type: "success",
        text1: "Challenge deleted",
        text2: "Challenge removed successfully.",
        position: "bottom",
      });
    } catch (err) {
      console.error("Delete challenge error:", err);
      Toast.show({
        type: "error",
        text1: "Delete failed",
        text2: err instanceof Error ? err.message : "Please try again.",
        position: "bottom",
      });
    }
  }, [token]);

  useEffect(() => {
    if (!progressHydrated) return;
    if (autoJoinQueue.current.size === 0) return;

    for (const [taskId, task] of autoJoinQueue.current.entries()) {
      const joined = joinChallenge(task, { silent: true });
      if (joined) {
        autoJoinQueue.current.delete(taskId);
      }
    }
  }, [progressHydrated, user, joinChallenge]);

  useEffect(() => {
    if (!progressHydrated) return;

    const userSnapshot = user ?? null;

    setProgressMap((prev) => {
      let changed = false;
      const next: Record<string, ProgressEntry> = { ...prev };
      const taskById = new Map(tasks.map((task) => [task._id, task]));

      Object.keys(next).forEach((taskId) => {
        if (!taskById.has(taskId)) {
          delete next[taskId];
          changed = true;
        }
      });

      tasks.forEach((task) => {
        const config = METRIC_CONFIG[task.type];
        if (!config) return;

        const currentRaw = config.selector(userSnapshot);
        const existing = next[task._id];

        if (task.completed) {
          const baselineRaw = Number.isFinite(existing?.baselineRaw) ? existing!.baselineRaw : currentRaw;
          if (
            !existing ||
            !existing.completed ||
            existing.percent !== 100 ||
            existing.progressValue !== task.target ||
            !existing.completionSynced
          ) {
            next[task._id] = {
              joined: true,
              baselineRaw,
              metric: task.type,
              progressValue: task.target,
              percent: 100,
              completed: true,
              completionSynced: true,
            };
            changed = true;
          }
          return;
        }

        if (!existing || !existing.joined) {
          return;
        }

        let entry = existing.metric === task.type ? { ...existing } : undefined;

        if (!entry) {
          entry = {
            joined: true,
            baselineRaw: currentRaw,
            metric: task.type,
            progressValue: 0,
            percent: 0,
            completed: false,
            completionSynced: false,
          };
        }

        if (currentRaw < entry.baselineRaw) {
          entry = {
            ...entry,
            baselineRaw: currentRaw,
            progressValue: 0,
            percent: 0,
            completed: false,
            completionSynced: false,
          };
        }

        const delta = config.computeDelta(currentRaw, entry.baselineRaw);
        const safeDelta = Number.isFinite(delta) ? Math.max(0, delta) : 0;
        const clampedValue = task.target > 0 ? Math.min(safeDelta, task.target) : safeDelta;
        const percent = task.target > 0 ? Math.min(100, Math.round((clampedValue / task.target) * 100)) : 100;
        const completed = safeDelta >= task.target;

        if (
          entry.progressValue !== clampedValue ||
          entry.percent !== percent ||
          entry.completed !== completed
        ) {
          entry = {
            ...entry,
            progressValue: clampedValue,
            percent,
            completed,
          };
        }

        const hasChanged =
          !existing ||
          existing.baselineRaw !== entry.baselineRaw ||
          existing.metric !== entry.metric ||
          existing.progressValue !== entry.progressValue ||
          existing.percent !== entry.percent ||
          existing.completed !== entry.completed ||
          existing.completionSynced !== entry.completionSynced ||
          existing.joined !== entry.joined;

        if (hasChanged) {
          next[task._id] = entry;
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [tasks, user, progressHydrated]);

  useEffect(() => {
    if (!progressHydrated || !token) return;

    const pending = Object.entries(progressMap).filter(([taskId, entry]) => {
      if (!entry.completed || entry.completionSynced) return false;
      if (completionInFlight.current.has(taskId)) return false;
      const task = tasks.find((t) => t._id === taskId);
      return task ? !task.completed : false;
    });

    pending.forEach(([taskId]) => {
      const task = tasks.find((t) => t._id === taskId);
      if (!task) return;

      completionInFlight.current.add(taskId);
      ensureSyncingState(taskId, true);

      const targetValue = task.target;

      (async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/tasks/${taskId}/complete`, {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(data?.msg || "Failed to sync completion");
          }

          setTasks((prev) =>
            prev.map((t) => (t._id === taskId ? { ...t, completed: true } : t))
          );

          setProgressMap((prev) => {
            const existing = prev[taskId];
            if (!existing) return prev;
            return {
              ...prev,
              [taskId]: {
                ...existing,
                completionSynced: true,
                completed: true,
                percent: 100,
                progressValue: targetValue,
              },
            };
          });

          Toast.show({
            type: "success",
            text1: "Challenge completed",
            text2: "Goal achieved.",
            position: "bottom",
          });
        } catch (err) {
          console.error("Mark task complete error:", err);
          Toast.show({
            type: "error",
            text1: "Sync failed",
            text2: "We'll retry once you're back online.",
            position: "bottom",
          });
        } finally {
          completionInFlight.current.delete(taskId);
          ensureSyncingState(taskId, false);
        }
      })();
    });
  }, [progressMap, tasks, token, progressHydrated, ensureSyncingState]);

  const handleJoin = useCallback(
    (task: Task) => {
      joinChallenge(task);
    },
    [joinChallenge]
  );

  const renderCard = (task: Task, index: number) => {
    const config = METRIC_CONFIG[task.type];
    const progressEntry = progressMap[task._id];
    const joined = task.completed || !!progressEntry?.joined;
    const completed = task.completed || !!progressEntry?.completed;
    const progressPercent = completed ? 100 : progressEntry?.percent ?? 0;
    const clampedProgress = Math.min(progressPercent, 100);

    const progressValue = completed ? task.target : progressEntry?.progressValue ?? 0;
    const formattedProgress = config
      ? `${config.formatValue(progressValue)} / ${config.formatTarget(task.target)} ${config.unitLabel}`
      : `${progressValue} / ${task.target}`;

    const IconComponent = TASK_TYPE_ICON[task.type] ?? Trophy;
    const difficultyColor = difficultyColors[task.difficulty] || colors.accent.primary;
    const trackingAvailable = progressHydrated && !!config && config.canTrack(user ?? null);
    const syncingCompletion = syncingIds.has(task._id);
    const joinDisabled = !progressHydrated || !trackingAvailable;

    return (
      <Animated.View
        key={task._id}
        entering={FadeInDown.duration(400).springify()}
        exiting={FadeOutDown.duration(300)}
        layout={Layout.springify()}
        className="mb-4"
      >
        <Pressable
          onPress={!joined ? () => handleJoin(task) : undefined}
          style={[{
            backgroundColor: colors.background.elevated,
            borderColor: colors.border.medium,
            borderWidth: 1,
            borderRadius: 24,
            padding: 20,
          }]}
          className="active:scale-[0.98]"
        >
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-3 flex-1">
              <View className="w-12 h-12 rounded-2xl items-center justify-center" style={{ backgroundColor: `${difficultyColor}15` }}>
                <IconComponent size={24} color={difficultyColor} />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold" style={{ color: colors.text.primary }}>
                  {task.type.charAt(0).toUpperCase() + task.type.slice(1)} Challenge
                </Text>
                <Text className="text-sm mt-0.5" style={{ color: colors.text.secondary }}>{task.description}</Text>
              </View>
            </View>
            <Pressable
              onPress={() => deleteChallenge(task._id)}
              className="w-10 h-10 rounded-lg items-center justify-center"
              style={{ backgroundColor: `${colors.status.error}15` }}
            >
              <Trash2 size={18} color={colors.status.error} />
            </Pressable>
          </View>

          <View className="flex-row items-center gap-2 mb-4">
            <View className="px-3 py-1.5 rounded-lg" style={{ backgroundColor: `${difficultyColor}20` }}>
              <Text className="text-xs font-bold" style={{ color: difficultyColor }}>
                {task.difficulty.toUpperCase()}
              </Text>
            </View>
            <View className="px-3 py-1.5 rounded-lg" style={{ backgroundColor: colors.background.tertiary }}>
              <Text className="text-xs font-semibold" style={{ color: colors.text.secondary }}>
                Target: {config ? `${config.formatTarget(task.target)} ${config.unitLabel}` : task.target}
              </Text>
            </View>
          </View>

          {!joined ? (
            <View>
              <Pressable
                disabled={joinDisabled}
                onPress={() => handleJoin(task)}
                style={[{
                  backgroundColor: joinDisabled ? colors.background.tertiary : colors.status.success,
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                }]}
              >
                <Text className="text-sm font-bold" style={{ color: joinDisabled ? colors.text.disabled : '#FFFFFF' }}>
                  {progressHydrated ? (trackingAvailable ? "Join Challenge" : "Tracking Unavailable") : "Loading..."}
                </Text>
              </Pressable>
              {!progressHydrated && (
                <Text className="text-xs text-center mt-2" style={{ color: colors.text.tertiary }}>Preparing your data...</Text>
              )}
            </View>
          ) : (
            <View>
              <View className="mb-2">
                <View className="flex-row justify-between items-center mb-1.5">
                  <Text className="text-xs font-semibold" style={{ color: colors.text.secondary }}>Progress</Text>
                  <Text className="text-xs font-bold" style={{ color: colors.text.primary }}>{Math.round(clampedProgress)}%</Text>
                </View>
                <View className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: colors.background.tertiary }}>
                  <Animated.View
                    style={{
                      width: `${clampedProgress}%`,
                      height: "100%",
                      backgroundColor: completed ? colors.status.success : colors.status.info,
                    }}
                  />
                </View>
              </View>
              <Text className="text-sm font-semibold text-center" style={{ color: colors.text.secondary }}>
                {formattedProgress}
              </Text>
              {completed && (
                <View className="mt-2 rounded-lg py-2 px-3" style={{ backgroundColor: `${colors.status.success}15` }}>
                  <Text className="text-xs font-bold text-center" style={{ color: colors.status.success }}>Challenge Completed</Text>
                </View>
              )}
              {syncingCompletion && !completed && (
                <Text className="text-xs text-center mt-1" style={{ color: colors.text.tertiary }}>Syncing...</Text>
              )}
            </View>
          )}
        </Pressable>
      </Animated.View>
    );
  };
  return (
    <ScreenWrapper bg={isDark ? "bg-background-dark" : "bg-gray-100"}>
      <SafeAreaView className="flex-1">
        <ScrollView
          contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 16 }}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(600).delay(80)} className="pt-6 pb-4">
            <Text className="text-4xl font-black tracking-tight" style={{ color: colors.text.primary }}>Challenges</Text>
            <Text className="text-base mt-2" style={{ color: colors.text.secondary }}>
              Push your limits and track your progress.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(500).delay(100)} className="mb-4">
            <View className="rounded-3xl p-5" style={{ backgroundColor: colors.background.elevated, borderColor: colors.border.medium, borderWidth: 1, minHeight: showGoalEditor ? undefined : 180 }}>
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-xl font-bold" style={{ color: colors.text.primary }}>Daily Goals</Text>
                <Pressable
                  onPress={() => setShowGoalEditor(!showGoalEditor)}
                  className="px-3 py-1.5 rounded-lg"
                  style={{ backgroundColor: `${colors.status.info}20` }}
                >
                  <Text className="text-xs font-semibold" style={{ color: colors.status.info }}>
                    {showGoalEditor ? "Done" : "Edit"}
                  </Text>
                </Pressable>
              </View>

              {showGoalEditor ? (
                <View className="gap-3">
                  <View>
                    <Text className="text-sm font-semibold mb-2" style={{ color: colors.text.secondary }}>Distance Goal (meters)</Text>
                    <View className="flex-row items-center gap-2">
                      <Pressable
                        onPress={() => setDailyGoals(prev => ({ ...prev, distance: Math.max(0, prev.distance - 1000) }))}
                        className="w-10 h-10 rounded-lg items-center justify-center"
                        style={{ backgroundColor: colors.background.tertiary }}
                      >
                        <Text className="font-bold text-lg" style={{ color: colors.text.primary }}>-</Text>
                      </Pressable>
                      <View className="flex-1 rounded-lg py-2" style={{ backgroundColor: colors.background.tertiary }}>
                        <Text className="text-center font-bold" style={{ color: colors.text.primary }}>{dailyGoals.distance}m</Text>
                      </View>
                      <Pressable
                        onPress={() => setDailyGoals(prev => ({ ...prev, distance: prev.distance + 1000 }))}
                        className="w-10 h-10 rounded-lg items-center justify-center"
                        style={{ backgroundColor: colors.background.tertiary }}
                      >
                        <Text className="font-bold text-lg" style={{ color: colors.text.primary }}>+</Text>
                      </Pressable>
                    </View>
                  </View>

                  <View>
                    <Text className="text-sm font-semibold mb-2" style={{ color: colors.text.secondary }}>Steps Goal</Text>
                    <View className="flex-row items-center gap-2">
                      <Pressable
                        onPress={() => setDailyGoals(prev => ({ ...prev, steps: Math.max(0, prev.steps - 1000) }))}
                        className="w-10 h-10 rounded-lg items-center justify-center"
                        style={{ backgroundColor: colors.background.tertiary }}
                      >
                        <Text className="font-bold text-lg" style={{ color: colors.text.primary }}>-</Text>
                      </Pressable>
                      <View className="flex-1 rounded-lg py-2" style={{ backgroundColor: colors.background.tertiary }}>
                        <Text className="text-center font-bold" style={{ color: colors.text.primary }}>{dailyGoals.steps} steps</Text>
                      </View>
                      <Pressable
                        onPress={() => setDailyGoals(prev => ({ ...prev, steps: prev.steps + 1000 }))}
                        className="w-10 h-10 rounded-lg items-center justify-center"
                        style={{ backgroundColor: colors.background.tertiary }}
                      >
                        <Text className="font-bold text-lg" style={{ color: colors.text.primary }}>+</Text>
                      </Pressable>
                    </View>
                  </View>

                  <View>
                    <Text className="text-sm font-semibold mb-2" style={{ color: colors.text.secondary }}>Territories Goal</Text>
                    <View className="flex-row items-center gap-2">
                      <Pressable
                        onPress={() => setDailyGoals(prev => ({ ...prev, territories: Math.max(0, prev.territories - 1) }))}
                        className="w-10 h-10 rounded-lg items-center justify-center"
                        style={{ backgroundColor: colors.background.tertiary }}
                      >
                        <Text className="font-bold text-lg" style={{ color: colors.text.primary }}>-</Text>
                      </Pressable>
                      <View className="flex-1 rounded-lg py-2" style={{ backgroundColor: colors.background.tertiary }}>
                        <Text className="text-center font-bold" style={{ color: colors.text.primary }}>{dailyGoals.territories} territories</Text>
                      </View>
                      <Pressable
                        onPress={() => setDailyGoals(prev => ({ ...prev, territories: prev.territories + 1 }))}
                        className="w-10 h-10 rounded-lg items-center justify-center"
                        style={{ backgroundColor: colors.background.tertiary }}
                      >
                        <Text className="font-bold text-lg" style={{ color: colors.text.primary }}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ) : (
                <View className="gap-3">
                  {(() => {
                    const distanceProgress = dailyProgress
                      ? Math.max(0, (user?.distance ?? 0) - dailyProgress.startDistance)
                      : 0;
                    const stepsProgress = dailyProgress
                      ? Math.max(0, (user?.steps ?? 0) - dailyProgress.startSteps)
                      : 0;
                    const territoriesProgress = dailyProgress
                      ? Math.max(0, (user?.territories ?? 0) - dailyProgress.startTerritories)
                      : 0;

                    const distancePercent = Math.min(100, (distanceProgress / dailyGoals.distance) * 100);
                    const stepsPercent = Math.min(100, (stepsProgress / dailyGoals.steps) * 100);
                    const territoriesPercent = Math.min(100, (territoriesProgress / dailyGoals.territories) * 100);

                    return (
                      <>
                        <View>
                          <View className="flex-row justify-between items-center mb-1">
                            <Text className="text-sm font-semibold" style={{ color: colors.text.secondary }}>Distance</Text>
                            <Text className="text-xs font-bold" style={{ color: colors.text.primary }}>
                              {distanceProgress}m / {dailyGoals.distance}m
                            </Text>
                          </View>
                          <View className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: colors.background.tertiary }}>
                            <View
                              style={{ width: `${distancePercent}%`, height: "100%", backgroundColor: colors.status.info }}
                            />
                          </View>
                        </View>

                        <View>
                          <View className="flex-row justify-between items-center mb-1">
                            <Text className="text-sm font-semibold" style={{ color: colors.text.secondary }}>Steps</Text>
                            <Text className="text-xs font-bold" style={{ color: colors.text.primary }}>
                              {stepsProgress} / {dailyGoals.steps}
                            </Text>
                          </View>
                          <View className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: colors.background.tertiary }}>
                            <View
                              style={{ width: `${stepsPercent}%`, height: "100%", backgroundColor: '#8B5CF6' }}
                            />
                          </View>
                        </View>

                        <View>
                          <View className="flex-row justify-between items-center mb-1">
                            <Text className="text-sm font-semibold" style={{ color: colors.text.secondary }}>Territories</Text>
                            <Text className="text-xs font-bold" style={{ color: colors.text.primary }}>
                              {territoriesProgress} / {dailyGoals.territories}
                            </Text>
                          </View>
                          <View className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: colors.background.tertiary }}>
                            <View
                              style={{ width: `${territoriesPercent}%`, height: "100%", backgroundColor: colors.status.success }}
                            />
                          </View>
                        </View>
                      </>
                    );
                  })()}
                </View>
              )}
            </View>
          </Animated.View>

          {loading && tasks.length === 0 ? (
            <View className="items-center justify-center py-16">
              <ActivityIndicator size="large" color={colors.status.info} />
              <Text className="mt-4" style={{ color: colors.text.secondary }}>Loading challenges...</Text>
            </View>
          ) : tasks.length === 0 ? (
            <Animated.View entering={FadeInDown.duration(600).delay(200)} className="items-center py-16">
              <Text className="text-xl font-semibold" style={{ color: colors.text.primary }}>No challenges yet</Text>
              <Text className="mt-2 text-center" style={{ color: colors.text.secondary }}>
                Generate one to get started.
              </Text>
            </Animated.View>
          ) : (
            <Animated.View layout={Layout.springify()}>
              <Animated.View 
                entering={FadeInDown.duration(500).delay(120)}
                layout={Layout.springify()}
              >
                <Pressable
                  disabled={loading}
                  onPress={generateAITask}
                  className="rounded-3xl p-6 mb-4"
                  style={[{ backgroundColor: colors.background.elevated, borderColor: colors.border.medium, borderWidth: 1 }, ({ pressed }) => ({ opacity: pressed ? 0.95 : 1 })]}
                >
                  <View className="flex-row items-center mb-4">
                    <View className="p-3 rounded-2xl mr-3" style={{ backgroundColor: `${colors.status.success}15` }}>
                      <Trophy size={32} color={colors.status.success} strokeWidth={2.5} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xl font-bold" style={{ color: colors.text.primary }}>AI Challenge</Text>
                      <Text className="text-sm mt-0.5" style={{ color: colors.text.secondary }}>
                        Powered by your stats
                      </Text>
                    </View>
                  </View>
                  
                  <Text className="text-sm mb-4 leading-5" style={{ color: colors.text.secondary }}>
                    Get a personalized challenge tailored to your recent performance, activity streak, and fitness level.
                  </Text>
                  
                  <View
                    className="w-full items-center rounded-2xl py-3.5"
                    style={{ backgroundColor: loading ? colors.background.tertiary : colors.status.success }}
                  >
                    <Text className="text-base font-bold" style={{ color: loading ? colors.text.secondary : '#FFFFFF' }}>
                      {loading ? "Generating..." : "Generate Challenge"}
                    </Text>
                  </View>
                </Pressable>
              </Animated.View>
              {tasks.map((task, idx) => renderCard(task, idx))}
            </Animated.View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ScreenWrapper>
  );
};

export default ChallengesScreen;