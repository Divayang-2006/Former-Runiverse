import { api } from "./api";
import { authService } from "./AuthService";
import { useStore } from "@/store/useStore";
import type { Activity } from "@/store/types";

interface ActivitiesResponse {
  success: boolean;
  data?: ActivityPayload[];
  message?: string;
}

interface ActivityPayload {
  id?: string;
  _id?: string;
  userId?: string;
  activityType?: string;
  totalDistance?: number;
  calories?: number;
  avgSpeed?: number;
  startTime?: string | number | Date;
  endTime?: string | number | Date;
  loopDetected?: boolean;
  hexesVisited?: unknown;
  detectedRoutes?: unknown;
  createdAt?: string | number | Date;
  updatedAt?: string | number | Date;
}

const toIsoString = (value: string | number | Date | undefined): string => {
  if (value === undefined || value === null) {
    return new Date(0).toISOString();
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? new Date(0).toISOString() : value.toISOString();
  }
  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
};

const toStringId = (value?: string): string => (typeof value === "string" && value.trim().length > 0 ? value : "");

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === "string").map((entry) => entry.trim()).filter(Boolean);
};

const mapActivity = (payload: ActivityPayload): Activity => {
  const id = toStringId(payload.id ?? payload._id);

  return {
    id,
    userId: toStringId(payload.userId),
    activityType: payload.activityType ?? "unknown",
    totalDistance: typeof payload.totalDistance === "number" ? payload.totalDistance : 0,
    calories: typeof payload.calories === "number" ? payload.calories : 0,
    avgSpeed: typeof payload.avgSpeed === "number" ? payload.avgSpeed : 0,
    startTime: toIsoString(payload.startTime),
    endTime: toIsoString(payload.endTime),
    loopDetected: Boolean(payload.loopDetected),
    hexesVisited: toStringArray(payload.hexesVisited),
    detectedRoutes: toStringArray(payload.detectedRoutes),
    createdAt: toIsoString(payload.createdAt),
    updatedAt: toIsoString(payload.updatedAt),
  };
};

const buildActivitiesPath = (userId: string, limit?: number, includeStreams?: boolean): string => {
  const params = new URLSearchParams();
  if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
    params.set("limit", Math.min(Math.floor(limit), 100).toString());
  }
  if (includeStreams) {
    params.set("includeStreams", "true");
  }
  const query = params.toString();
  return `/api/users/${encodeURIComponent(userId)}/activities${query ? `?${query}` : ""}`;
};

export const activityService = {
  async fetchActivities(options?: { limit?: number; includeStreams?: boolean; userId?: string }): Promise<Activity[]> {
    await authService.hydrate();
    const token = authService.getToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    const state = useStore.getState();
    const targetUserId = options?.userId ?? state.user?.id;
    if (!targetUserId) {
      throw new Error("Missing user id");
    }

    const path = buildActivitiesPath(targetUserId, options?.limit, options?.includeStreams);
    const response = await api.get<ActivitiesResponse>(path, token);

    if (!response || !response.success || !Array.isArray(response.data)) {
      throw new Error(response?.message ?? "Failed to fetch activities");
    }

    const mapped = response.data.map(mapActivity);
    state.setActivities(mapped);
    return mapped;
  },

  getCachedActivities(): Activity[] {
    return useStore.getState().activities;
  },

  addOrUpdateCache(items: Activity[]): void {
    if (!Array.isArray(items) || items.length === 0) {
      return;
    }
    useStore.getState().upsertActivities(items);
  },

  clearCache(): void {
    useStore.getState().clearActivities();
  },
};

export default activityService;
