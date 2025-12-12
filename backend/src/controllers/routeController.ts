import type { Request, Response } from "express";
import { Types } from "mongoose";
import Route, { type RouteDocument } from "../models/Route.js";
import RouteSegment from "../models/RouteSegment.js";
import RouteMatch from "../models/RouteMatch.js";
import SavedRoute from "../models/SavedRoute.js";
import type { UserDocument } from "../models/User.js";

interface AuthenticatedRequest extends Request {
  user?: UserDocument;
}

interface CreateRouteBody {
  name?: string;
  description?: string | null;
  distance?: number;
  elevationGain?: number;
  popularityScore?: number;
  isPublic?: boolean;
  loop?: boolean;
  boundingBox?: Record<string, unknown> | null;
  simplifiedPath?: Record<string, unknown> | null;
  segments?: Array<{
    segmentIndex?: number;
    coordinates?: Record<string, unknown> | unknown[];
  }>;
}

interface CreateMatchBody {
  activityId?: string;
  routeId?: string;
  similarityScore?: number;
}

interface DetectRoutesBody {
  activityId?: string;
  limit?: number;
}

const parseSegments = (segments?: CreateRouteBody["segments"]) => {
  if (!Array.isArray(segments)) {
    return [];
  }

  return segments
    .map((segment) => {
      const segmentIndex = typeof segment.segmentIndex === "number" && segment.segmentIndex >= 0 ? segment.segmentIndex : null;
      if (segmentIndex === null) {
        return null;
      }

      if (segment.coordinates === undefined || segment.coordinates === null) {
        return null;
      }

      return {
        segmentIndex,
        coordinates: segment.coordinates,
      };
    })
    .filter((value): value is { segmentIndex: number; coordinates: Record<string, unknown> | unknown[] } => value !== null);
};

const loadSegmentsForRoutes = async (routeIds: Types.ObjectId[]) => {
  if (routeIds.length === 0) {
    return new Map<string, Array<{ segmentIndex: number; coordinates: unknown }>>();
  }

  const segments = await RouteSegment.find({ routeId: { $in: routeIds } }).sort({ routeId: 1, segmentIndex: 1 });
  const byRoute = new Map<string, Array<{ segmentIndex: number; coordinates: unknown }>>();

  segments.forEach((segment) => {
    const key = segment.routeId.toString();
    const existing = byRoute.get(key) ?? [];
    existing.push({ segmentIndex: segment.segmentIndex, coordinates: segment.coordinates });
    byRoute.set(key, existing);
  });

  return byRoute;
};

const serializeRoute = (route: RouteDocument, segments: Array<{ segmentIndex: number; coordinates: unknown }> = []) => ({
  id: route._id.toString(),
  creatorId: route.creatorId.toString(),
  name: route.name,
  description: route.description ?? null,
  distance: route.distance,
  elevationGain: route.elevationGain,
  popularityScore: route.popularityScore,
  isPublic: route.isPublic,
  loop: route.loop,
  boundingBox: route.boundingBox ?? null,
  simplifiedPath: route.simplifiedPath ?? null,
  createdAt: route.createdAt,
  updatedAt: route.updatedAt,
  segments,
});

export const createRoute = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const {
      name,
      description = null,
      distance,
      elevationGain,
      popularityScore = 0,
      isPublic = true,
      loop = false,
      boundingBox = null,
      simplifiedPath = null,
      segments,
    } = req.body as CreateRouteBody;

    if (!name || typeof distance !== "number" || typeof elevationGain !== "number") {
      return res.status(400).json({ message: "name, distance, and elevationGain are required" });
    }

    const route = await Route.create({
      creatorId: req.user._id,
      name: name.trim(),
      description: description ?? null,
      distance,
      elevationGain,
      popularityScore: popularityScore ?? 0,
      isPublic,
      loop,
      boundingBox,
      simplifiedPath,
    });

    const normalizedSegments = parseSegments(segments);
    if (normalizedSegments.length > 0) {
      await RouteSegment.insertMany(
        normalizedSegments.map((segment) => ({
          routeId: route._id,
          segmentIndex: segment.segmentIndex,
          coordinates: segment.coordinates,
        }))
      );
    }

    return res.status(201).json({ success: true, data: serializeRoute(route, normalizedSegments) });
  } catch (error) {
    console.error("createRoute error:", error);
    return res.status(500).json({ message: "Failed to create route" });
  }
};

export const detectRoutes = async (
  req: AuthenticatedRequest & Request<unknown, unknown, DetectRoutesBody> ,
  res: Response
): Promise<Response> => {
  try {
    const max = Math.min(req.body.limit ?? 10, 25);

    const routes = await Route.find({ isPublic: true }).sort({ popularityScore: -1, createdAt: -1 }).limit(max);
    const segmentsByRoute = await loadSegmentsForRoutes(routes.map((route) => route._id));

    let matches = [] as Array<{ routeId: string; similarityScore: number; matchedAt: Date }>;
    if (req.body.activityId && Types.ObjectId.isValid(req.body.activityId)) {
      const activityMatches = await RouteMatch.find({ activityId: req.body.activityId })
        .sort({ similarityScore: -1 })
        .limit(max);

      matches = activityMatches.map((match) => ({
        routeId: match.routeId.toString(),
        similarityScore: match.similarityScore,
        matchedAt: match.matchedAt,
      }));
    }

    return res.json({
      success: true,
      data: {
        routes: routes.map((route) => serializeRoute(route, segmentsByRoute.get(route._id.toString()) ?? [])),
        matches,
      },
    });
  } catch (error) {
    console.error("detectRoutes error:", error);
    return res.status(500).json({ message: "Failed to detect routes" });
  }
};

export const getNearbyRoutes = async (
  req: Request<unknown, unknown, unknown, { limit?: string; includePrivate?: string; creatorId?: string }> ,
  res: Response
): Promise<Response> => {
  try {
    const { limit, includePrivate, creatorId } = req.query;
    const max = Math.min(Number.parseInt(limit ?? "20", 10) || 20, 100);

    const filter: Record<string, unknown> = {};
    if (creatorId && Types.ObjectId.isValid(creatorId)) {
      filter.creatorId = creatorId;
    }
    if (includePrivate !== "true") {
      filter.isPublic = true;
    }

    const routes = await Route.find(filter).sort({ popularityScore: -1, createdAt: -1 }).limit(max);
    const segmentsByRoute = await loadSegmentsForRoutes(routes.map((route) => route._id));

    return res.json({
      success: true,
      data: routes.map((route) => serializeRoute(route, segmentsByRoute.get(route._id.toString()) ?? [])),
    });
  } catch (error) {
    console.error("getNearbyRoutes error:", error);
    return res.status(500).json({ message: "Failed to load nearby routes" });
  }
};

export const getRouteById = async (req: Request<{ id: string }> , res: Response): Promise<Response> => {
  try {
    const route = await Route.findById(req.params.id);
    if (!route) {
      return res.status(404).json({ message: "Route not found" });
    }

    const segments = await RouteSegment.find({ routeId: route._id }).sort({ segmentIndex: 1 });

    return res.json({
      success: true,
      data: serializeRoute(
        route,
        segments.map((segment) => ({ segmentIndex: segment.segmentIndex, coordinates: segment.coordinates }))
      ),
    });
  } catch (error) {
    console.error("getRouteById error:", error);
    return res.status(500).json({ message: "Failed to fetch route" });
  }
};

export const saveRouteForUser = async (
  req: AuthenticatedRequest & Request<{ id: string }> ,
  res: Response
): Promise<Response> => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const route = await Route.findById(req.params.id);
    if (!route) {
      return res.status(404).json({ message: "Route not found" });
    }

    const saved = await SavedRoute.findOneAndUpdate(
      { userId: req.user._id, routeId: route._id },
      { $set: { savedAt: new Date() } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(201).json({
      success: true,
      data: {
        routeId: saved.routeId.toString(),
        savedAt: saved.savedAt,
      },
    });
  } catch (error) {
    console.error("saveRouteForUser error:", error);
    return res.status(500).json({ message: "Failed to save route" });
  }
};

export const listRoutesByUser = async (req: Request<{ id: string }, unknown, unknown, { limit?: string }> , res: Response): Promise<Response> => {
  try {
    const { limit } = req.query;
    const max = Math.min(Number.parseInt(limit ?? "25", 10) || 25, 100);

    if (!Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const routes = await Route.find({ creatorId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(max);

    const segmentsByRoute = await loadSegmentsForRoutes(routes.map((route) => route._id));

    return res.json({
      success: true,
      data: routes.map((route) => serializeRoute(route, segmentsByRoute.get(route._id.toString()) ?? [])),
    });
  } catch (error) {
    console.error("listRoutesByUser error:", error);
    return res.status(500).json({ message: "Failed to list user routes" });
  }
};

export const createRouteMatch = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { activityId, routeId, similarityScore } = req.body as CreateMatchBody;

    if (!activityId || !routeId || typeof similarityScore !== "number") {
      return res.status(400).json({ message: "activityId, routeId, and similarityScore are required" });
    }

    const match = await RouteMatch.findOneAndUpdate(
      { activityId, routeId },
      { $set: { similarityScore, matchedAt: new Date() } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await Route.findByIdAndUpdate(routeId, { $inc: { popularityScore: similarityScore } }).catch(() => undefined);

    return res.status(201).json({ success: true, data: match });
  } catch (error) {
    console.error("createRouteMatch error:", error);
    return res.status(500).json({ message: "Failed to record route match" });
  }
};

export default {
  createRoute,
  detectRoutes,
  getNearbyRoutes,
  getRouteById,
  saveRouteForUser,
  listRoutesByUser,
  createRouteMatch,
};
