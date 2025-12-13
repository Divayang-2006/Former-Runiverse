import type { Request, Response } from "express";
import { Types } from "mongoose";
import Activity from "../models/Activity.js";
import type { UserDocument } from "../models/User.js";

interface AuthenticatedRequest extends Request {
  user?: UserDocument;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const STREAK_LOOKBACK_DAYS = 120;

const formatUtcDateKey = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseUtcDateKey = (key: string): Date => new Date(`${key}T00:00:00.000Z`);

const diffInUtcDays = (later: Date, earlier: Date): number => {
  const laterMs = Date.UTC(later.getUTCFullYear(), later.getUTCMonth(), later.getUTCDate());
  const earlierMs = Date.UTC(earlier.getUTCFullYear(), earlier.getUTCMonth(), earlier.getUTCDate());
  return Math.round((laterMs - earlierMs) / MS_PER_DAY);
};

const buildSummary = async (userId: string, since: Date) => {
  if (!Types.ObjectId.isValid(userId)) {
    return null;
  }

  const [result] = await Activity.aggregate([
    {
      $match: {
        userId: new Types.ObjectId(userId),
        startTime: { $gte: since },
      },
    },
    {
      $group: {
        _id: null,
        totalDistance: { $sum: "$totalDistance" },
        totalCalories: { $sum: "$calories" },
        avgSpeed: { $avg: "$avgSpeed" },
        activities: { $sum: 1 },
      },
    },
  ]);

  if (!result) {
    return {
      userId,
      totalDistance: 0,
      totalCalories: 0,
      avgSpeed: 0,
      activities: 0,
      since,
    };
  }

  return {
    userId,
    totalDistance: result.totalDistance ?? 0,
    totalCalories: result.totalCalories ?? 0,
    avgSpeed: result.avgSpeed ?? 0,
    activities: result.activities ?? 0,
    since,
  };
};

interface DailyActivityStat {
  _id: string;
  count: number;
}

const computeStreakSummary = (dailyStats: DailyActivityStat[]) => {
  if (dailyStats.length === 0) {
    return {
      streakDays: 0,
      streakActivities: 0,
      streakDates: [] as string[],
    };
  }

  const todayKey = formatUtcDateKey(new Date());
  const mostRecentKey = dailyStats[0]._id;
  const daysSinceMostRecent = diffInUtcDays(parseUtcDateKey(todayKey), parseUtcDateKey(mostRecentKey));

  if (daysSinceMostRecent > 1) {
    return {
      streakDays: 0,
      streakActivities: 0,
      streakDates: [] as string[],
    };
  }

  const streakDates: string[] = [];
  let streakDays = 0;
  let streakActivities = 0;
  let expectedPreviousDate: Date | null = null;

  for (const stat of dailyStats) {
    const statDate = parseUtcDateKey(stat._id);

    if (!expectedPreviousDate) {
      streakDates.push(stat._id);
      streakDays += 1;
      streakActivities += stat.count;
      expectedPreviousDate = statDate;
      continue;
    }

    const gap = diffInUtcDays(expectedPreviousDate, statDate);

    if (gap === 0) {
      // Defensive: aggregation groups by day so this should not happen.
      continue;
    }

    if (gap !== 1) {
      break;
    }

    streakDates.push(stat._id);
    streakDays += 1;
    streakActivities += stat.count;
    expectedPreviousDate = statDate;
  }

  return {
    streakDays,
    streakActivities,
    streakDates,
  };
};

const assertCronAuthorized = (req: Request): boolean => {
  const secret = process.env.SUMMARY_CRON_SECRET;
  if (!secret) {
    return true;
  }
  return req.headers["x-cron-secret"] === secret;
};

export const getDailySummary = async (
  req: Request<unknown, unknown, unknown, { userId?: string }> ,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const summary = await buildSummary(userId, since);
    if (!summary) {
      return res.status(400).json({ message: "Invalid userId" });
    }

    return res.json({ success: true, data: summary });
  } catch (error) {
    console.error("getDailySummary error:", error);
    return res.status(500).json({ message: "Failed to build daily summary" });
  }
};

export const getWeeklySummary = async (
  req: Request<unknown, unknown, unknown, { userId?: string }> ,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const summary = await buildSummary(userId, since);
    if (!summary) {
      return res.status(400).json({ message: "Invalid userId" });
    }

    return res.json({ success: true, data: summary });
  } catch (error) {
    console.error("getWeeklySummary error:", error);
    return res.status(500).json({ message: "Failed to build weekly summary" });
  }
};

export const getStreakSummary = async (
  req: Request<unknown, unknown, unknown, { userId?: string; windowDays?: string }> ,
  res: Response
): Promise<Response> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = req.query.userId ?? authReq.user?._id?.toString();

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    if (!Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid userId" });
    }

    const requestedWindow = Number(req.query.windowDays);
    const windowDays = Number.isFinite(requestedWindow)
      ? Math.min(Math.max(Math.floor(requestedWindow), 1), 365)
      : STREAK_LOOKBACK_DAYS;

    const since = new Date(Date.now() - windowDays * MS_PER_DAY);

    const dailyStats = await Activity.aggregate<DailyActivityStat>([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          startTime: { $gte: since },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$startTime",
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
    ]);

    const { streakDays, streakActivities, streakDates } = computeStreakSummary(dailyStats);

    return res.json({
      success: true,
      data: {
        userId,
        streakDays,
        streakActivities,
        activeDays: dailyStats.map((stat) => stat._id),
        streakDates,
        windowDays,
      },
    });
  } catch (error) {
    console.error("getStreakSummary error:", error);
    return res.status(500).json({ message: "Failed to build streak summary" });
  }
};

export const runDailyCron = async (req: Request, res: Response): Promise<Response> => {
  try {
    if (!assertCronAuthorized(req)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Placeholder: real implementation would dispatch a job.
    return res.status(202).json({ success: true, message: "Daily summary cron triggered" });
  } catch (error) {
    console.error("runDailyCron error:", error);
    return res.status(500).json({ message: "Failed to trigger daily cron" });
  }
};

export const runWeeklyCron = async (req: Request, res: Response): Promise<Response> => {
  try {
    if (!assertCronAuthorized(req)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Placeholder: real implementation would dispatch a job.
    return res.status(202).json({ success: true, message: "Weekly summary cron triggered" });
  } catch (error) {
    console.error("runWeeklyCron error:", error);
    return res.status(500).json({ message: "Failed to trigger weekly cron" });
  }
};
