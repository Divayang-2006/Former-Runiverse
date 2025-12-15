import { api } from "./api";
import { authService } from "./AuthService";

export interface ActivityStatsSummary {
  activities: number;
  totalDistance: number;
  totalCalories: number;
  totalDurationSeconds: number;
  avgSpeed: number;
  avgPaceSeconds: number;
}

interface ActivityStatsResponse {
  success: boolean;
  message?: string;
  data?: Record<string, ActivityStatsSummary>;
}

const DEFAULT_RANGES = ["today", "week", "all"] as const;

export type StatsRange = typeof DEFAULT_RANGES[number] | "month" | "year" | "custom";

const encodeDate = (value: Date): string => value.toISOString();

const DEFAULT_CACHE_TTL_MS = 60_000;

const buildCacheKey = (ranges: StatsRange[], from?: Date, to?: Date): string => {
  const normalizedRanges = [...new Set(ranges)].sort().join("|");
  const fromKey = from instanceof Date && !Number.isNaN(from.getTime()) ? encodeDate(from) : "";
  const toKey = to instanceof Date && !Number.isNaN(to.getTime()) ? encodeDate(to) : "";
  return `${normalizedRanges}::${fromKey}::${toKey}`;
};

const statsCache = new Map<string, { data: Record<string, ActivityStatsSummary>; expiry: number }>();
const inflight = new Map<string, Promise<Record<string, ActivityStatsSummary>>>();

export const statsService = {
  async fetchActivityStats(options?: {
    ranges?: StatsRange[];
    from?: Date;
    to?: Date;
    forceRefresh?: boolean;
    cacheTtlMs?: number;
  }): Promise<Record<string, ActivityStatsSummary>> {
    await authService.hydrate();
    const token = authService.getToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    const ranges = options?.ranges && options.ranges.length > 0 ? options.ranges : DEFAULT_RANGES;
    const cacheKey = buildCacheKey(ranges, options?.from, options?.to);
    const ttl = typeof options?.cacheTtlMs === "number" && options.cacheTtlMs > 0 ? options.cacheTtlMs : DEFAULT_CACHE_TTL_MS;

    if (options?.forceRefresh) {
      statsCache.delete(cacheKey);
      inflight.delete(cacheKey);
    }

    if (!options?.forceRefresh) {
      const cached = statsCache.get(cacheKey);
      if (cached && cached.expiry > Date.now()) {
        return cached.data;
      }

      const pending = inflight.get(cacheKey);
      if (pending) {
        return pending;
      }
    }

    const params = new URLSearchParams();
    params.set("ranges", Array.from(new Set(ranges)).join(","));

    if (options?.from instanceof Date && !Number.isNaN(options.from.getTime())) {
      params.set("from", encodeDate(options.from));
    }

    if (options?.to instanceof Date && !Number.isNaN(options.to.getTime())) {
      params.set("to", encodeDate(options.to));
    }

    const query = params.toString();
    const path = `/api/users/me/activity-stats${query ? `?${query}` : ""}`;

    const request = api
      .get<ActivityStatsResponse>(path, token)
      .then((response) => {
        if (!response || response.success === false) {
          throw new Error(response?.message || "Failed to fetch activity stats");
        }

        const data = response.data ?? {};
        statsCache.set(cacheKey, { data, expiry: Date.now() + ttl });
        return data;
      })
      .finally(() => {
        inflight.delete(cacheKey);
      });

    inflight.set(cacheKey, request);
    return request;
  },
};

export default statsService;
