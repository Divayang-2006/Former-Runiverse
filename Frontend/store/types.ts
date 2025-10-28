export interface User {
  id: string;
  username: string;
  avatarUrl: string; // may be null from backend; keep string for now to simplify UI usage
  groupId: string | null;
  // Extended fields aligned with backend
  email?: string;
  steps?: number;
  distance?: number; // meters
  territories?: number;
  displayName?: string | null;
  city?: string | null;
  lifetimeSteps?: number;
  lifetimeDistance?: number;
}

export interface Group {
  id: string;
  name: string;
  color: string;
  memberCount: number;
}

export interface WalkSession {
  isActive: boolean;
  startTime: number | null;
  elapsedTime: number; // in seconds
  distance: number; // in meters
  steps: number;
  calories: number;
  path: { latitude: number; longitude: number }[];
}

export interface UserStats {
  totalDistance: number; // in meters
  totalSteps: number;
  totalCalories: number;
  currentStreak: number;
}

export interface GridCell {
  id: string; // e.g., "lat_lng"
  ownerGroupId: string | null;
  influence: Record<string, number>; // { [groupId]: score }
}

export interface TerritoryState {
  grid: Record<string, GridCell>; // { [cellId]: GridCell }
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  goal: number; // e.g., 5000 steps
  currentProgress: number;
  type: "steps" | "distance";
  isCompleted: boolean;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  earnedOn: string | null;
  icon: string; // Placeholder for image/icon name
}
