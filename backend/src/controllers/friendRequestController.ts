import type { Request, Response } from "express";
import FriendRequest, { type FriendRequestStatus } from "../models/FriendRequest.js";
import User from "../models/User.js";
import type { UserDocument } from "../models/User.js";

interface AuthenticatedRequest extends Request {
  user?: UserDocument;
}

interface CreateFriendRequestBody {
  receiverId?: string;
}

interface RespondFriendRequestBody {
  status?: FriendRequestStatus;
}

const sanitizeUser = (user: UserDocument) => ({
  id: user._id.toString(),
  username: user.username,
  displayName: user.displayName ?? null,
  avatar: user.avatar ?? null,
});

export const createFriendRequest = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { receiverId } = req.body as CreateFriendRequestBody;
    if (!receiverId) {
      return res.status(400).json({ message: "receiverId is required" });
    }

    if (receiverId === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot send friend request to yourself" });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: "Receiver not found" });
    }

    const existing = await FriendRequest.findOne({ senderId: req.user._id, receiverId });
    if (existing) {
      if (existing.status === "pending") {
        return res.status(409).json({ message: "Friend request already pending" });
      }
      existing.status = "pending";
      existing.createdAt = new Date();
      await existing.save();
      return res.status(200).json({ success: true, data: existing });
    }

    const requestDoc = await FriendRequest.create({ senderId: req.user._id, receiverId, status: "pending" });

    return res.status(201).json({ success: true, data: requestDoc });
  } catch (error) {
    console.error("createFriendRequest error:", error);
    return res.status(500).json({ message: "Failed to create friend request" });
  }
};

export const respondToFriendRequest = async (
  req: AuthenticatedRequest & Request<{ id: string }>,
  res: Response
): Promise<Response> => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { status } = req.body as RespondFriendRequestBody;
    if (!status || !["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ message: "status must be 'accepted' or 'rejected'" });
    }

    const requestDoc = await FriendRequest.findById(req.params.id);
    if (!requestDoc) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    if (requestDoc.receiverId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the receiver can respond" });
    }

    requestDoc.status = status;
    requestDoc.updatedAt = new Date();
    await requestDoc.save();

    return res.json({ success: true, data: requestDoc });
  } catch (error) {
    console.error("respondToFriendRequest error:", error);
    return res.status(500).json({ message: "Failed to respond to friend request" });
  }
};

const updateFriendRequestStatus = async (
  req: AuthenticatedRequest & Request<{ id: string }> ,
  res: Response,
  status: FriendRequestStatus
): Promise<Response> => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const requestDoc = await FriendRequest.findById(req.params.id);
    if (!requestDoc) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    if (requestDoc.receiverId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the receiver can respond" });
    }

    requestDoc.status = status;
    requestDoc.updatedAt = new Date();
    await requestDoc.save();

    return res.json({ success: true, data: requestDoc });
  } catch (error) {
    console.error("updateFriendRequestStatus error:", error);
    return res.status(500).json({ message: "Failed to update friend request" });
  }
};

export const acceptFriendRequest = async (
  req: AuthenticatedRequest & Request<{ id: string }> ,
  res: Response
): Promise<Response> => updateFriendRequestStatus(req, res, "accepted");

export const rejectFriendRequest = async (
  req: AuthenticatedRequest & Request<{ id: string }> ,
  res: Response
): Promise<Response> => updateFriendRequestStatus(req, res, "rejected");

export const listFriendRequests = async (
  req: AuthenticatedRequest & Request<unknown, unknown, unknown, { direction?: "incoming" | "outgoing" }>,
  res: Response
): Promise<Response> => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const direction = req.query.direction ?? "incoming";

    const filter =
      direction === "outgoing"
        ? { senderId: req.user._id }
        : { receiverId: req.user._id };

    const requests = await FriendRequest.find(filter).sort({ createdAt: -1 });

    const counterpartIds = requests.map((request) =>
      direction === "outgoing" ? request.receiverId : request.senderId
    );

    const users = await User.find({ _id: { $in: counterpartIds } });
    const usersById = new Map(users.map((user) => [user._id.toString(), sanitizeUser(user)]));

    const payload = requests.map((request) => ({
      id: request._id,
      status: request.status,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      counterpart:
        usersById.get(
          (direction === "outgoing" ? request.receiverId : request.senderId).toString()
        ) ?? null,
    }));

    return res.json({ success: true, data: payload });
  } catch (error) {
    console.error("listFriendRequests error:", error);
    return res.status(500).json({ message: "Failed to list friend requests" });
  }
};
