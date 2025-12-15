import { api } from "./api";
import { authService } from "./AuthService";
import statsService, { type StatsRange, type ActivityStatsSummary } from "./statsService";
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
  elevationGain?: number;
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
    elevationGain: typeof payload.elevationGain === "number" ? payload.elevationGain : 0,
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

const CACHE_TTL_MS = 60_000;

const buildCacheKey = (userId: string, limit?: number, includeStreams?: boolean): string =>
  `${userId}::${limit ?? ""}::${includeStreams ? "streams" : "base"}`;

const activityCache = new Map<string, { data: Activity[]; expiry: number }>();
const pendingRequests = new Map<string, Promise<Activity[]>>();

type StatsOptions = {
  ranges?: StatsRange[];
  from?: Date;
  to?: Date;
  forceRefresh?: boolean;
  cacheTtlMs?: number;
  onResolved?: (stats: Record<string, ActivityStatsSummary>) => void;
};

const fetchStatsIfNeeded = async (options?: StatsOptions): Promise<Record<string, ActivityStatsSummary> | null> => {
  if (!options) {
    return null;
  }

  try {
    const { onResolved, ...query } = options;
    const stats = await statsService.fetchActivityStats(query);
    if (typeof onResolved === "function") {
      onResolved(stats);
    }
    return stats;
  } catch (error) {
    console.warn("[activityService] stats fetch failed", error);
    return null;
  }
};

interface FetchActivitiesOptions {
  limit?: number;
  includeStreams?: boolean;
  userId?: string;
  forceRefresh?: boolean;
  stats?: StatsOptions;
}

export const activityService = {
  async fetchActivities(options?: FetchActivitiesOptions): Promise<Activity[]> {
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

    const cacheKey = buildCacheKey(targetUserId, options?.limit, options?.includeStreams);
    const now = Date.now();

    if (!options?.forceRefresh) {
      const cached = activityCache.get(cacheKey);
      if (cached && cached.expiry > now) {
        if (state.activities.length === 0) {
          state.setActivities(cached.data);
        }
        await fetchStatsIfNeeded(options?.stats);
        return cached.data;
      }

      const pending = pendingRequests.get(cacheKey);
      if (pending) {
        const activities = await pending;
        await fetchStatsIfNeeded(options?.stats);
        return activities;
      }
    } else {
      activityCache.delete(cacheKey);
      pendingRequests.delete(cacheKey);
    }

    const path = buildActivitiesPath(targetUserId, options?.limit, options?.includeStreams);

    const request = api
      .get<ActivitiesResponse>(path, token)
      .then((response) => {
        if (!response || !response.success || !Array.isArray(response.data)) {
          throw new Error(response?.message ?? "Failed to fetch activities");
        }

        const mapped = response.data.map(mapActivity);
        activityCache.set(cacheKey, { data: mapped, expiry: Date.now() + CACHE_TTL_MS });
        state.setActivities(mapped);
        return mapped;
      })
      .finally(() => {
        pendingRequests.delete(cacheKey);
      });

    pendingRequests.set(cacheKey, request);

    const [activities] = await Promise.all([request, fetchStatsIfNeeded(options?.stats)]);
    return activities;
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
