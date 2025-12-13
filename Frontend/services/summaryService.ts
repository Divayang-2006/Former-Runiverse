import { api } from "./api";
import { authService } from "./AuthService";

interface StreakSummaryResponse {
  success: boolean;
  data?: {
    userId: string;
    streakDays: number;
    streakActivities: number;
    activeDays?: string[];
    streakDates?: string[];
    windowDays?: number;
  };
  message?: string;
}

export interface StreakSummaryData {
  userId: string;
  streakDays: number;
  streakActivities: number;
  activeDays: string[];
  streakDates: string[];
  windowDays: number;
}

const sanitizeList = (values?: string[]): string[] => {
  if (!Array.isArray(values)) {
    return [];
  }

  const seen = new Set<string>();
  const sanitized: string[] = [];

  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    sanitized.push(trimmed);
  }

  return sanitized;
};

export const summaryService = {
  async getStreakSummary(windowDays?: number): Promise<StreakSummaryData> {
    await authService.hydrate();
    const token = authService.getToken();

    if (!token) {
      throw new Error("Not authenticated");
    }

    const query = typeof windowDays === "number" ? `?windowDays=${encodeURIComponent(windowDays)}` : "";
    const response = await api.get<StreakSummaryResponse>(`/api/summaries/streak${query}`, token);

    if (!response || !response.success || !response.data) {
      throw new Error(response?.message ?? "Failed to fetch streak summary");
    }

    const {
      userId,
      streakDays = 0,
      streakActivities = 0,
      activeDays,
      streakDates,
      windowDays: resolvedWindowDays = windowDays ?? 0,
    } = response.data;

    return {
      userId,
      streakDays,
      streakActivities,
      activeDays: sanitizeList(activeDays),
      streakDates: sanitizeList(streakDates),
      windowDays: typeof resolvedWindowDays === "number" && !Number.isNaN(resolvedWindowDays)
        ? resolvedWindowDays
        : windowDays ?? 0,
    };
  },
};

export default summaryService;
