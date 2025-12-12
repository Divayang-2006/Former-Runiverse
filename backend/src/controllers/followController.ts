import type { Request, Response } from "express";
import FollowRelation from "../models/FollowRelation.js";
import User from "../models/User.js";
import type { UserDocument } from "../models/User.js";

interface AuthenticatedRequest extends Request {
  user?: UserDocument;
}

const sanitizeUser = (user: UserDocument) => ({
  id: user._id.toString(),
  username: user.username,
  displayName: user.displayName ?? null,
  avatar: user.avatar ?? null,
  bio: user.bio ?? null,
});

export const followUser = async (
  req: AuthenticatedRequest & Request<{ userId: string }> ,
  res: Response
): Promise<Response> => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const targetUserId = req.params.userId;

    if (!targetUserId || targetUserId === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot follow yourself" });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ message: "Target user not found" });
    }

    const relation = await FollowRelation.findOneAndUpdate(
      { followerId: req.user._id, followingId: targetUser._id },
      {},
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(201).json({ success: true, data: relation });
  } catch (error) {
    console.error("followUser error:", error);
    return res.status(500).json({ message: "Failed to follow user" });
  }
};

export const unfollowUser = async (req: AuthenticatedRequest & Request<{ userId: string }>, res: Response): Promise<Response> => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    await FollowRelation.findOneAndDelete({ followerId: req.user._id, followingId: req.params.userId });

    return res.json({ success: true });
  } catch (error) {
    console.error("unfollowUser error:", error);
    return res.status(500).json({ message: "Failed to unfollow user" });
  }
};

export const listFollowers = async (
  req: Request<{ id: string }> ,
  res: Response
): Promise<Response> => {
  try {
    const relations = await FollowRelation.find({ followingId: req.params.id }).sort({ createdAt: -1 });
    const userIds = relations.map((relation) => relation.followerId);
    const users = await User.find({ _id: { $in: userIds } });
    const usersById = new Map(users.map((user) => [user._id.toString(), sanitizeUser(user)]));

    const payload = relations.map((relation) => ({
      followerId: relation.followerId,
      createdAt: relation.createdAt,
      user: usersById.get(relation.followerId.toString()) ?? null,
    }));

    return res.json({ success: true, data: payload });
  } catch (error) {
    console.error("listFollowers error:", error);
    return res.status(500).json({ message: "Failed to list followers" });
  }
};

export const listFollowing = async (
  req: Request<{ id: string }> ,
  res: Response
): Promise<Response> => {
  try {
    const relations = await FollowRelation.find({ followerId: req.params.id }).sort({ createdAt: -1 });
    const userIds = relations.map((relation) => relation.followingId);
    const users = await User.find({ _id: { $in: userIds } });
    const usersById = new Map(users.map((user) => [user._id.toString(), sanitizeUser(user)]));

    const payload = relations.map((relation) => ({
      followingId: relation.followingId,
      createdAt: relation.createdAt,
      user: usersById.get(relation.followingId.toString()) ?? null,
    }));

    return res.json({ success: true, data: payload });
  } catch (error) {
    console.error("listFollowing error:", error);
    return res.status(500).json({ message: "Failed to list following" });
  }
};

export const listFollowSuggestions = async (
  req: AuthenticatedRequest & Request<unknown, unknown, unknown, { limit?: string }> ,
  res: Response
): Promise<Response> => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const max = Math.min(Number.parseInt(req.query.limit ?? "10", 10) || 10, 25);

    const existingRelations = await FollowRelation.find({ followerId: req.user._id });
    const excludedIds = new Set(existingRelations.map((relation) => relation.followingId.toString()));
    excludedIds.add(req.user._id.toString());

    const suggestions = await User.find({ _id: { $nin: Array.from(excludedIds) } })
      .sort({ createdAt: -1 })
      .limit(max);

    return res.json({ success: true, data: suggestions.map(sanitizeUser) });
  } catch (error) {
    console.error("listFollowSuggestions error:", error);
    return res.status(500).json({ message: "Failed to build suggestions" });
  }
};
