/* This TypeScript code snippet is creating a complex state management system using the Zustand
library. Here's a breakdown of what the code is doing: */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Activity,
  Badge,
  Challenge,
  GridCell,
  Group,
  MetricsKey,
  MetricsSummary,
  User,
  UserStats,
  WalkSession,
} from "./types";
import { mockGroups } from "@/services/leaderboardService";

const DEFAULT_CHALLENGES: Challenge[] = [
  {
    id: "warmup-steps",
    title: "Warmup Steps",
    description: "Log 2,000 steps to kickstart your streak.",
    goal: 2000,
    currentProgress: 0,
    type: "steps",
    isCompleted: false,
  },
  {
    id: "distance-scout",
    title: "Distance Scout",
    description: "Cover 1.5 km exploring your neighborhood.",
    goal: 1500,
    currentProgress: 0,
    type: "distance",
    isCompleted: false,
  },
];

const DEFAULT_BADGES: Badge[] = [
  {
    id: "day-one",
    name: "Day One",
    description: "Completed your first Runiverse session.",
    earnedOn: null,
    icon: "star",
  },
  {
    id: "scout",
    name: "Territory Scout",
    description: "Claimed a territory for the first time.",
    earnedOn: null,
    icon: "map",
  },
];
// import { initialGrid } from "@/services/territoryEngine";

// Define state slices
interface UserSlice {
  user: User | null;
  group: Group | null;
  setUser: (user: User | null) => void;
  joinGroup: (groupId: string) => void;
  updateUser: (partial: Partial<User>) => void;
}

interface StatsSlice {
  stats: UserStats;
  addWalkStats: (
    session: Pick<WalkSession, "distance" | "steps" | "calories">
  ) => void;
}

interface TrackingSlice {
  session: WalkSession;
  startSession: () => void;
  stopSession: () => void;
  updateSession: (updates: Partial<WalkSession>) => void;
  resetSession: () => void;
  applyStepDelta: (deltaSteps: number) => void;
}

interface TerritorySlice {
  grid: Record<string, GridCell>;
  updateCellInfluence: (
    cellId: string,
    groupId: string,
    influence: number
  ) => void;
}

interface ChallengeSlice {
  challenges: Challenge[];
  badges: Badge[];
  updateChallengeProgress: (type: "steps" | "distance", value: number) => void;
  earnBadge: (badgeId: string) => void;
}

interface ActivitySlice {
  activities: Activity[];
  setActivities: (items: Activity[]) => void;
  upsertActivities: (items: Activity[]) => void;
  clearActivities: () => void;
}

interface MetricsSlice {
  metrics: Record<MetricsKey, MetricsSummary | null>;
  setMetrics: (payload: Partial<Record<MetricsKey, MetricsSummary | null>>) => void;
  clearMetrics: () => void;
}

// Create the combined store
export const useStore = create<
  UserSlice &
    StatsSlice &
    TrackingSlice &
    TerritorySlice &
    ChallengeSlice &
    ActivitySlice &
    MetricsSlice
>()(
  persist(
    (set, get) => ({
      // User Slice
      user: null,
      group: null,
      setUser: (user) => set({ user }),
      joinGroup: (groupId) => {
        const group = mockGroups.find((g) => g.id === groupId) || null;
        set((state) => ({
          user: state.user ? { ...state.user, groupId } : null,
          group,
        }));
      },
      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : state.user,
        })),

      // Stats Slice
      stats: {
        totalDistance: 125000,
        totalSteps: 156250,
        totalCalories: 6250,
        currentStreak: 5,
      },
      addWalkStats: ({ distance, steps, calories }) => {
        set((state) => ({
          stats: {
            ...state.stats,
            totalDistance: state.stats.totalDistance + distance,
            totalSteps: state.stats.totalSteps + steps,
            totalCalories: state.stats.totalCalories + calories,
          },
        }));
      },

      // Tracking Slice
      session: {
        isActive: false,
        startTime: null,
        elapsedTime: 0,
        distance: 0,
        steps: 0,
        calories: 0,
        path: [],
      },
      startSession: () =>
        set({
          session: { ...get().session, isActive: true, startTime: Date.now() },
        }),
      stopSession: () =>
        set({ session: { ...get().session, isActive: false } }),
      updateSession: (updates) =>
        set((state) => ({ session: { ...state.session, ...updates } })),
      resetSession: () =>
        set({
          session: {
            isActive: false,
            startTime: null,
            elapsedTime: 0,
            distance: 0,
            steps: 0,
            calories: 0,
            path: [],
          },
        }),
      applyStepDelta: (deltaSteps) => {
        if (deltaSteps <= 0) {
          return;
        }
        const state = get();
        if (!state.session.isActive) {
          return;
        }
        const STRIDE_M = 0.78;
        const CAL_PER_STEP = 0.04;
        const addDistance = deltaSteps * STRIDE_M;
        const addCalories = deltaSteps * CAL_PER_STEP;
        set({
          session: {
            ...state.session,
            steps: state.session.steps + deltaSteps,
            distance: state.session.distance + addDistance,
            calories: state.session.calories + addCalories,
          },
          stats: {
            ...state.stats,
            totalSteps: state.stats.totalSteps + deltaSteps,
            totalDistance: state.stats.totalDistance + addDistance,
            totalCalories: state.stats.totalCalories + addCalories,
          },
        });
      },

      // Territory Slice
      grid: {},
      updateCellInfluence: (cellId, groupId, influence) => {
        set((state) => {
          const newGrid = { ...state.grid };
          const cell = newGrid[cellId];
          if (cell) {
            cell.influence[groupId] = (cell.influence[groupId] || 0) + influence;
            const topGroup = Object.entries(cell.influence).sort(([, a], [, b]) => b - a)[0];
            cell.ownerGroupId = topGroup[1] > 0 ? topGroup[0] : null;
          }
          return { grid: newGrid };
        });
      },

      // Challenge Slice
      challenges: DEFAULT_CHALLENGES,
      badges: DEFAULT_BADGES,
      updateChallengeProgress: (type, value) => {
        set((state) => {
          const updatedChallenges = state.challenges.map((challenge) => {
            if (challenge.type === type && !challenge.isCompleted) {
              const newProgress = Math.min(challenge.goal, challenge.currentProgress + value);
              return {
                ...challenge,
                currentProgress: newProgress,
                isCompleted: newProgress >= challenge.goal,
              };
            }
            return challenge;
          });
          return { challenges: updatedChallenges };
        });
      },
      earnBadge: (badgeId) => {
        set((state) => ({
          badges: state.badges.map((badge) =>
            badge.id === badgeId ? { ...badge, earnedOn: new Date().toISOString() } : badge
          ),
        }));
      },

      // Activity Slice
      activities: [],
      setActivities: (items) => {
        set({ activities: [...items].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()) });
      },
      upsertActivities: (items) => {
        if (!Array.isArray(items) || items.length === 0) {
          return;
        }
        set((state) => {
          const merged = new Map<string, Activity>(state.activities.map((activity) => [activity.id, activity]));
          for (const item of items) {
            const existing = merged.get(item.id);
            merged.set(item.id, existing ? { ...existing, ...item } : item);
          }
          const sorted = Array.from(merged.values()).sort(
            (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
          );
          return { activities: sorted };
        });
      },
      clearActivities: () => set({ activities: [] }),

      // Metrics Slice
      metrics: {
        weekly: null,
        yearToDate: null,
        allTime: null,
      },
      setMetrics: (payload) =>
        set((state) => ({
          metrics: {
            ...state.metrics,
            ...payload,
          },
        })),
      clearMetrics: () =>
        set({
          metrics: {
            weekly: null,
            yearToDate: null,
            allTime: null,
          },
        }),
    }),
    {
      name: "runiverse-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        stats: state.stats,
        group: state.group,
        activities: state.activities,
        metrics: state.metrics,
      }),
    }
  )
);
