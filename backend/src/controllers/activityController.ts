import type { Request, Response } from "express";
import Activity from "../models/Activity.js";
import ActivityStream from "../models/ActivityStream.js";
import RouteMatch from "../models/RouteMatch.js";
import type { ActivityDocument } from "../models/Activity.js";
import type { UserDocument } from "../models/User.js";

interface AuthenticatedRequest extends Request {
  user?: UserDocument;
}

interface CreateActivityBody {
  startTime?: string | number | Date;
  endTime?: string | number | Date;
  totalDistance?: number;
  calories?: number;
  avgSpeed?: number;
  activityType?: string;
  loopDetected?: boolean;
  hexesVisited?: string[];
  detectedRoutes?: string[];
  stream?: {
    gps?: Record<string, unknown> | null;
    heartRate?: Record<string, unknown> | null;
    steps?: Record<string, unknown> | null;
    pace?: Record<string, unknown> | null;
  };
}

const toDate = (value: string | number | Date | undefined): Date | null => {
  if (value === undefined || value === null) {
    return null;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === "number") {
    const result = new Date(value);
    return Number.isNaN(result.getTime()) ? null : result;
  }
  if (typeof value === "string") {
    const result = new Date(value);
    return Number.isNaN(result.getTime()) ? null : result;
  }
  return null;
};

const sanitizeActivity = (
  activity: ActivityDocument,
  stream?: {
    gps?: Record<string, unknown> | null;
    heartRate?: Record<string, unknown> | null;
    steps?: Record<string, unknown> | null;
    pace?: Record<string, unknown> | null;
  }
) => ({
  id: activity._id.toString(),
  userId: activity.userId,
  startTime: activity.startTime,
  endTime: activity.endTime,
  totalDistance: activity.totalDistance,
  calories: activity.calories,
  avgSpeed: activity.avgSpeed,
  activityType: activity.activityType,
  loopDetected: activity.loopDetected,
  hexesVisited: activity.hexesVisited,
  detectedRoutes: activity.detectedRoutes,
  createdAt: activity.createdAt,
  updatedAt: activity.updatedAt,
  stream: stream ?? undefined,
});

export const createActivity = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const body = req.body as CreateActivityBody;

    const startTime = toDate(body.startTime);
    const endTime = toDate(body.endTime);

    if (!startTime || !endTime) {
      return res.status(400).json({ message: "startTime and endTime are required" });
    }

    if (endTime < startTime) {
      return res.status(400).json({ message: "endTime must be after startTime" });
    }

    if (typeof body.totalDistance !== "number" || typeof body.calories !== "number" || typeof body.avgSpeed !== "number") {
      return res
        .status(400)
        .json({ message: "totalDistance, calories, and avgSpeed must be provided as numbers" });
    }

    if (!body.activityType) {
      return res.status(400).json({ message: "activityType is required" });
    }

    const activity = await Activity.create({
      userId: req.user._id,
      startTime,
      endTime,
      totalDistance: body.totalDistance,
      calories: body.calories,
      avgSpeed: body.avgSpeed,
      activityType: body.activityType,
      loopDetected: Boolean(body.loopDetected),
      hexesVisited: Array.isArray(body.hexesVisited) ? body.hexesVisited : [],
      detectedRoutes: Array.isArray(body.detectedRoutes) ? body.detectedRoutes : [],
    });

    if (body.stream) {
      const hasStreamData = Object.values(body.stream).some((value) => value !== undefined && value !== null);
      if (hasStreamData) {
        await ActivityStream.findOneAndUpdate(
          { activityId: activity._id },
          {
            $set: {
              gps: body.stream.gps ?? null,
              heartRate: body.stream.heartRate ?? null,
              steps: body.stream.steps ?? null,
              pace: body.stream.pace ?? null,
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }
    }

    return res.status(201).json({ success: true, data: sanitizeActivity(activity, body.stream ?? undefined) });
  } catch (error) {
    console.error("createActivity error:", error);
    return res.status(500).json({ message: "Failed to create activity" });
  }
};

export const listActivities = async (
  req: AuthenticatedRequest & Request<unknown, unknown, unknown, { userId?: string; limit?: string; includeStreams?: string }>,
  res: Response
): Promise<Response> => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { userId, limit, includeStreams } = req.query;
    const targetUserId = userId ?? req.user._id.toString();

    const max = Math.min(Number.parseInt(limit ?? "25", 10) || 25, 100);

    const activities = await Activity.find({ userId: targetUserId }).sort({ startTime: -1 }).limit(max);

    let streamsByActivity: Record<string, { gps?: Record<string, unknown> | null; heartRate?: Record<string, unknown> | null; steps?: Record<string, unknown> | null; pace?: Record<string, unknown> | null }> = {};

    if (includeStreams === "true") {
      const streams = await ActivityStream.find({ activityId: { $in: activities.map((a) => a._id) } });
      streamsByActivity = streams.reduce<typeof streamsByActivity>((acc, stream) => {
        acc[stream.activityId.toString()] = {
          gps: stream.gps ?? null,
          heartRate: stream.heartRate ?? null,
          steps: stream.steps ?? null,
          pace: stream.pace ?? null,
        };
        return acc;
      }, {});
    }

    const payload = activities.map((activity) => sanitizeActivity(activity, streamsByActivity[activity._id.toString()]));

    return res.json({ success: true, data: payload });
  } catch (error) {
    console.error("listActivities error:", error);
    return res.status(500).json({ message: "Failed to list activities" });
  }
};

export const getActivityById = async (
  req: AuthenticatedRequest & Request<{ id: string }, unknown, unknown, { includeStream?: string; includeMatches?: string }>,
  res: Response
): Promise<Response> => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const activity = await Activity.findById(req.params.id);
    if (!activity) {
      return res.status(404).json({ message: "Activity not found" });
    }

    if (activity.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Forbidden" });
    }

    let stream: { gps?: Record<string, unknown> | null; heartRate?: Record<string, unknown> | null; steps?: Record<string, unknown> | null; pace?: Record<string, unknown> | null } | undefined;
    if (req.query.includeStream === "true") {
      const streamDoc = await ActivityStream.findOne({ activityId: activity._id });
      if (streamDoc) {
        stream = {
          gps: streamDoc.gps ?? null,
          heartRate: streamDoc.heartRate ?? null,
          steps: streamDoc.steps ?? null,
          pace: streamDoc.pace ?? null,
        };
      }
    }

    let matches;
    if (req.query.includeMatches === "true") {
      matches = await RouteMatch.find({ activityId: activity._id }).sort({ similarityScore: -1 });
    }

    return res.json({
      success: true,
      data: {
        ...sanitizeActivity(activity, stream),
        matches,
      },
    });
  } catch (error) {
    console.error("getActivityById error:", error);
    return res.status(500).json({ message: "Failed to fetch activity" });
  }
};

export const addActivityStream = async (
  req: AuthenticatedRequest & Request<{ id: string }> ,
  res: Response
): Promise<Response> => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const activity = await Activity.findById(req.params.id);
    if (!activity) {
      return res.status(404).json({ message: "Activity not found" });
    }

    if (activity.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const stream = req.body as Record<string, unknown>;
    const hasStreamData = stream && Object.values(stream).some((value) => value !== undefined && value !== null);

    if (!hasStreamData) {
      return res.status(400).json({ message: "At least one stream dataset is required" });
    }

    const updatedStream = await ActivityStream.findOneAndUpdate(
      { activityId: activity._id },
      {
        $set: {
          gps: (stream.gps as Record<string, unknown> | null | undefined) ?? null,
          heartRate: (stream.heartRate as Record<string, unknown> | null | undefined) ?? null,
          steps: (stream.steps as Record<string, unknown> | null | undefined) ?? null,
          pace: (stream.pace as Record<string, unknown> | null | undefined) ?? null,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(201).json({ success: true, data: sanitizeActivity(activity, updatedStream?.toObject() ?? undefined) });
  } catch (error) {
    console.error("addActivityStream error:", error);
    return res.status(500).json({ message: "Failed to attach activity stream" });
  }
};

export const listActivitiesForUser = async (
  req: Request<{ id: string }, unknown, unknown, { limit?: string; includeStreams?: string }> ,
  res: Response
): Promise<Response> => {
  try {
    const { limit, includeStreams } = req.query;
    const targetUserId = req.params.id;

    const max = Math.min(Number.parseInt(limit ?? "25", 10) || 25, 100);

    const activities = await Activity.find({ userId: targetUserId }).sort({ startTime: -1 }).limit(max);

    let streamsByActivity: Record<string, { gps?: Record<string, unknown> | null; heartRate?: Record<string, unknown> | null; steps?: Record<string, unknown> | null; pace?: Record<string, unknown> | null }> = {};

    if (includeStreams === "true") {
      const streams = await ActivityStream.find({ activityId: { $in: activities.map((a) => a._id) } });
      streamsByActivity = streams.reduce<typeof streamsByActivity>((acc, stream) => {
        acc[stream.activityId.toString()] = {
          gps: stream.gps ?? null,
          heartRate: stream.heartRate ?? null,
          steps: stream.steps ?? null,
          pace: stream.pace ?? null,
        };
        return acc;
      }, {});
    }

    const payload = activities.map((activity) => sanitizeActivity(activity, streamsByActivity[activity._id.toString()]));

    return res.json({ success: true, data: payload });
  } catch (error) {
    console.error("listActivitiesForUser error:", error);
    return res.status(500).json({ message: "Failed to list user activities" });
  }
};
