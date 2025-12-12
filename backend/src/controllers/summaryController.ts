import type { Request, Response } from "express";
import { Types } from "mongoose";
import Activity from "../models/Activity.js";

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
