import type { Request, Response } from "express";
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
