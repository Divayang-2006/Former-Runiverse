import type { Request, Response } from "express";
import type { PipelineStage } from "mongoose";
import User, { type IUser, type UserDocument } from "../models/User.js";
import { buildUserSearchKeywords } from "../services/userService.js";
import { uploadImageBuffer } from "../services/cloudinaryService.js";
import { env } from "../config/env.js";
import Activity from "../models/Activity.js";
import ActivityStream from "../models/ActivityStream.js";
import FollowRelation from "../models/FollowRelation.js";
import FriendRequest from "../models/FriendRequest.js";
import ClubMember from "../models/ClubMember.js";
import TerritoryCell from "../models/TerritoryCell.js";

interface AuthenticatedRequest extends Request {
  user?: UserDocument;
  file?: Express.Multer.File;
}

interface UpdateProfileBody {
  displayName?: string | null;
  avatar?: string | null;
  bio?: string | null;
  mobileNumber?: string | null;
}

const sanitizeUser = (user: UserDocument) => ({
  id: user._id.toString(),
  username: user.username,
  email: user.email,
  displayName: user.displayName ?? null,
  avatar: user.avatar ?? null,
  bio: user.bio ?? null,
  mobileNumber: user.mobileNumber ?? null,
  searchKeywords: user.searchKeywords,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const getCurrentUser = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const freshUser = await User.findById(req.user._id);
    if (!freshUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ success: true, data: sanitizeUser(freshUser) });
  } catch (error) {
    console.error("getCurrentUser error:", error);
    return res.status(500).json({ message: "Failed to fetch profile" });
  }
};

export const getUserById = async (req: Request<{ id: string }>, res: Response): Promise<Response> => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ success: true, data: sanitizeUser(user) });
  } catch (error) {
    console.error("getUserById error:", error);
    return res.status(500).json({ message: "Failed to fetch user" });
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const incoming = req.body as UpdateProfileBody;
    const updates: Partial<IUser> = {};

    if (Object.prototype.hasOwnProperty.call(incoming, "displayName")) {
      updates.displayName = incoming.displayName?.trim() ?? null;
    }

    if (Object.prototype.hasOwnProperty.call(incoming, "avatar")) {
      updates.avatar = incoming.avatar ?? null;
    }

    if (Object.prototype.hasOwnProperty.call(incoming, "bio")) {
      updates.bio = incoming.bio ?? null;
    }

    if (Object.prototype.hasOwnProperty.call(incoming, "mobileNumber")) {
      updates.mobileNumber = incoming.mobileNumber ?? null;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No fields provided" });
    }

    const nextKeywords = buildUserSearchKeywords(req.user.username, updates.displayName ?? req.user.displayName ?? null, updates.bio ?? req.user.bio ?? null);
    updates.searchKeywords = nextKeywords;

    const updated = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true, runValidators: true });

    if (!updated) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ success: true, data: sanitizeUser(updated) });
  } catch (error) {
    console.error("updateProfile error:", error);
    return res.status(500).json({ message: "Failed to update profile" });
  }
};

export const searchUsers = async (req: Request<unknown, unknown, unknown, { q?: string }>, res: Response): Promise<Response> => {
  try {
    const query = req.query.q?.trim();
    if (!query) {
      return res.json({ success: true, data: [] });
    }

    const normalized = query.toLowerCase();
    const users = await User.find({ searchKeywords: normalized }).limit(20);

    return res.json({ success: true, data: users.map(sanitizeUser) });
  } catch (error) {
    console.error("searchUsers error:", error);
    return res.status(500).json({ message: "Failed to search users" });
  }
};

export const uploadAvatar = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No avatar file provided" });
    }

    const uploadResult = await uploadImageBuffer(req.file.buffer, {
      folder: env.cloudinaryAvatarFolder(),
      publicId: req.user._id.toString(),
      overwrite: true,
    });

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { avatar: uploadResult.secureUrl } },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(201).json({ success: true, data: sanitizeUser(updated) });
  } catch (error) {
    console.error("uploadAvatar error:", error);
    return res.status(500).json({ message: "Failed to upload avatar" });
  }
};

export const deleteAccount = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user._id;
    const activityIds = await Activity.find({ userId }).distinct("_id");

    const deletionTasks: Promise<unknown>[] = [
      Activity.deleteMany({ userId }).exec(),
      FollowRelation.deleteMany({ $or: [{ followerId: userId }, { followingId: userId }] }).exec(),
      FriendRequest.deleteMany({ $or: [{ senderId: userId }, { receiverId: userId }] }).exec(),
      ClubMember.deleteMany({ userId }).exec(),
      TerritoryCell.updateMany({ ownerId: userId }, { $set: { ownerId: null, ownerType: null } }).exec(),
    ];

    if (activityIds.length > 0) {
      deletionTasks.push(ActivityStream.deleteMany({ activityId: { $in: activityIds } }).exec());
    }

    await Promise.all(deletionTasks);

    const deleted = await User.findByIdAndDelete(userId);
    if (!deleted) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ success: true, message: "Account deleted" });
  } catch (error) {
    console.error("deleteAccount error:", error);
    return res.status(500).json({ message: "Failed to delete account" });
  }
};

type StatsRangeKey = "today" | "week" | "month" | "year" | "all";

interface RangeBounds {
  start?: Date;
  end?: Date;
}

const defaultRanges: StatsRangeKey[] = ["today", "week", "all"];

const startOfDay = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const startOfWeek = (date: Date): Date => {
  const result = startOfDay(date);
  const day = result.getDay();
  const diff = (day + 6) % 7; // ISO week starts on Monday
  result.setDate(result.getDate() - diff);
  return result;
};

const startOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), 1);

const startOfYear = (date: Date): Date => new Date(date.getFullYear(), 0, 1);

const resolveRangeBounds = (range: StatsRangeKey, now: Date): RangeBounds => {
  switch (range) {
    case "today":
      return { start: startOfDay(now) };
    case "week":
      return { start: startOfWeek(now) };
    case "month":
      return { start: startOfMonth(now) };
    case "year":
      return { start: startOfYear(now) };
    case "all":
    default:
      return {};
  }
};

const buildStatsFacet = (bounds: RangeBounds): PipelineStage[] => {
  const stages: PipelineStage[] = [];
  if (bounds.start || bounds.end) {
    const timeMatch: Record<string, unknown> = {};
    if (bounds.start) {
      timeMatch.$gte = bounds.start;
    }
    if (bounds.end) {
      timeMatch.$lte = bounds.end;
    }
    stages.push({ $match: { startTime: timeMatch } });
  }

  stages.push({
    $group: {
      _id: null,
      activities: { $sum: 1 },
      totalDistance: { $sum: { $ifNull: ["$totalDistance", 0] } },
      totalCalories: { $sum: { $ifNull: ["$calories", 0] } },
      totalDurationMs: {
        $sum: {
          $max: [
            0,
            {
              $subtract: [
                { $ifNull: ["$endTime", new Date(0)] },
                { $ifNull: ["$startTime", new Date(0)] },
              ],
            },
          ],
        },
      },
    },
  });

  stages.push({
    $project: {
      _id: 0,
      activities: 1,
      totalDistance: { $ifNull: ["$totalDistance", 0] },
      totalCalories: { $ifNull: ["$totalCalories", 0] },
      totalDurationSeconds: {
        $round: [
          {
            $divide: [
              { $ifNull: ["$totalDurationMs", 0] },
              1000,
            ],
          },
          2,
        ],
      },
    },
  });

  stages.push({
    $addFields: {
      avgSpeed: {
        $cond: [
          { $gt: ["$totalDurationSeconds", 0] },
          {
            $divide: [
              "$totalDistance",
              "$totalDurationSeconds",
            ],
          },
          0,
        ],
      },
      avgPaceSeconds: {
        $cond: [
          { $gt: ["$totalDistance", 0] },
          {
            $divide: [
              "$totalDurationSeconds",
              {
                $divide: ["$totalDistance", 1000],
              },
            ],
          },
          0,
        ],
      },
    },
  });

  return stages;
};

export const getActivityStats = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const now = new Date();
    const rangesParam = typeof req.query.ranges === "string" ? req.query.ranges : undefined;
    const requestedRanges = (rangesParam?.split(",") ?? defaultRanges).filter((entry): entry is StatsRangeKey => ["today", "week", "month", "year", "all"].includes(entry as StatsRangeKey));
    const uniqueRanges = Array.from(new Set(requestedRanges.length > 0 ? requestedRanges : defaultRanges));

    const facets: Record<string, PipelineStage[]> = {};
    for (const range of uniqueRanges) {
      facets[range] = buildStatsFacet(resolveRangeBounds(range, now));
    }

    const customStart = typeof req.query.from === "string" ? new Date(req.query.from) : undefined;
    const customEnd = typeof req.query.to === "string" ? new Date(req.query.to) : undefined;
    const customStartValid = customStart instanceof Date && !Number.isNaN(customStart.getTime()) ? customStart : undefined;
    const customEndValid = customEnd instanceof Date && !Number.isNaN(customEnd.getTime()) ? customEnd : undefined;

    if (customStartValid || customEndValid) {
      facets.custom = buildStatsFacet({ start: customStartValid, end: customEndValid });
    }

    if (Object.keys(facets).length === 0) {
      return res.json({ success: true, data: {} });
    }

    const pipeline: PipelineStage[] = [{ $match: { userId: req.user._id } }, { $facet: facets }];

    const [raw] = await Activity.aggregate(pipeline);

    const normalizeFacet = (key: string) => {
      const entry = Array.isArray(raw?.[key]) && raw[key].length > 0 ? raw[key][0] : undefined;
      return {
        activities: entry?.activities ?? 0,
        totalDistance: entry?.totalDistance ?? 0,
        totalCalories: entry?.totalCalories ?? 0,
        totalDurationSeconds: entry?.totalDurationSeconds ?? 0,
        avgSpeed: entry?.avgSpeed ?? 0,
        avgPaceSeconds: entry?.avgPaceSeconds ?? 0,
      };
    };

    const data: Record<string, ReturnType<typeof normalizeFacet>> = {};
    for (const key of Object.keys(facets)) {
      data[key] = normalizeFacet(key);
    }

    return res.json({ success: true, data });
  } catch (error) {
    console.error("getActivityStats error:", error);
    return res.status(500).json({ message: "Failed to aggregate activity stats" });
  }
};
