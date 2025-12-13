import { api } from "./api";
import { authService } from "./AuthService";
import type { MetricsKey, MetricsSummary } from "@/store/types";

interface MetricsPeriodSummary {
  start: string;
  end: string;
  days: number;
  activities: number;
  distanceMeters: number;
  durationMinutes: number;
  elevationGain?: number;
}

interface MetricsSummaryResponse {
  success: boolean;
  data?: {
    weekly?: MetricsPeriodSummary;
    yearToDate?: MetricsPeriodSummary;
    allTime?: MetricsPeriodSummary;
  };
  message?: string;
}

const toIsoString = (value: string | Date): string => {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return new Date(value).toISOString();
};

const sanitizeSummary = (payload?: MetricsPeriodSummary): MetricsSummary => {
  if (!payload) {
    return {
      start: new Date(0).toISOString(),
      end: new Date(0).toISOString(),
      days: 0,
      activities: 0,
      distanceMeters: 0,
      durationMinutes: 0,
      elevationGain: 0,
    };
  }

  return {
    start: toIsoString(payload.start),
    end: toIsoString(payload.end),
    days: typeof payload.days === "number" ? payload.days : 0,
    activities: typeof payload.activities === "number" ? payload.activities : 0,
    distanceMeters: typeof payload.distanceMeters === "number" ? payload.distanceMeters : 0,
    durationMinutes: typeof payload.durationMinutes === "number" ? payload.durationMinutes : 0,
    elevationGain: typeof payload.elevationGain === "number" ? payload.elevationGain : 0,
  };
};

export type MetricsSummaryData = Record<MetricsKey, MetricsSummary>;

export const statisticsService = {
  async fetchMetricsSummary(): Promise<MetricsSummaryData> {
    await authService.hydrate();
    const token = authService.getToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    const response = await api.get<MetricsSummaryResponse>(
      "/api/summaries/metrics?includeWeekly=true&includeYearToDate=true&includeAllTime=true",
      token
    );

    if (!response || !response.success || !response.data) {
      throw new Error(response?.message ?? "Failed to fetch metrics summary");
    }

    return {
      weekly: sanitizeSummary(response.data.weekly),
      yearToDate: sanitizeSummary(response.data.yearToDate),
      allTime: sanitizeSummary(response.data.allTime),
    };
  },
};

export default statisticsService;
