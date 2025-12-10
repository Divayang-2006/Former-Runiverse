/* This TypeScript code snippet is creating a complex state management system using the Zustand
library. Here's a breakdown of what the code is doing: */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  User,
  UserStats,
  WalkSession,
  GridCell,
  Challenge,
  Badge,
  Group,
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

interface SearchSlice {
  searchResults: User[];
  setSearchResults: (results: User[]) => void;
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

// Create the combined store
export const useStore = create<
  UserSlice &
    StatsSlice &
    TrackingSlice &
    TerritorySlice &
    ChallengeSlice &
    SearchSlice
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
        if (deltaSteps <= 0) return;
        const state = get();
        if (!state.session.isActive) return;
        // Basic stride + calorie estimation
        const STRIDE_M = 0.78; // average stride length in meters (tunable / could personalize)
        const CAL_PER_STEP = 0.04; // rough average calories per step
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
      const topGroup = Object.entries(cell.influence).sort(
        ([, a], [, b]) => b - a
      )[0];
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
          const updatedChallenges = state.challenges.map((c) => {
            if (c.type === type && !c.isCompleted) {
              const newProgress = Math.min(c.goal, c.currentProgress + value);
              return {
                ...c,
                currentProgress: newProgress,
                isCompleted: newProgress >= c.goal,
              };
            }
            return c;
          });
          return { challenges: updatedChallenges };
        });
      },
      earnBadge: (badgeId) => {
        set((state) => ({
          badges: state.badges.map((b) =>
            b.id === badgeId ? { ...b, earnedOn: new Date().toISOString() } : b
          ),
        }));
      },

      // Search Slice
      searchResults: [],
      setSearchResults: (results) => set({ searchResults: results }),
    }),
    {
      name: "runiverse-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        stats: state.stats,
        group: state.group,
      }), // Persist only these parts
    }
  )
);
