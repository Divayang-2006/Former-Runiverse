import type { Request, Response } from "express";
import Club from "../models/Club.js";
import type { ClubDocument } from "../models/Club.js";
import ClubMember from "../models/ClubMember.js";
import type { ClubMemberDocument } from "../models/ClubMember.js";
import User from "../models/User.js";
import type { UserDocument } from "../models/User.js";

interface AuthenticatedRequest extends Request {
  user?: UserDocument;
}

interface CreateClubBody {
  name?: string;
  description?: string | null;
}

const sanitizeClub = (club: ClubDocument) => ({
  id: club._id.toString(),
  name: club.name,
  description: club.description ?? null,
  ownerId: club.ownerId.toString(),
  createdAt: club.createdAt,
});

const sanitizeMember = (member: ClubMemberDocument, user: UserDocument | null | undefined) => ({
  id: member._id.toString(),
  clubId: member.clubId.toString(),
  userId: member.userId.toString(),
  role: member.role,
  joinedAt: member.joinedAt,
  user:
    user
      ? {
          id: user._id.toString(),
          username: user.username,
          displayName: user.displayName ?? null,
          avatar: user.avatar ?? null,
        }
      : null,
});

const buildSearchKeywords = (...values: Array<string | null | undefined>): string[] => {
  const keywords = new Set<string>();
  values
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .forEach((value) => {
      const normalized = value.trim().toLowerCase();
      keywords.add(normalized);
      normalized.split(/\s+/).forEach((segment) => {
        if (segment.length > 0) {
          keywords.add(segment);
        }
      });
    });
  return Array.from(keywords);
};

export const createClub = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { name, description } = req.body as CreateClubBody;
    if (!name) {
      return res.status(400).json({ message: "name is required" });
    }

    const club = await Club.create({
      name: name.trim(),
      description: description?.trim() ?? null,
      ownerId: req.user._id,
      searchKeywords: buildSearchKeywords(name, description ?? null),
    });

    await ClubMember.create({ clubId: club._id, userId: req.user._id, role: "owner" });

    return res.status(201).json({ success: true, data: sanitizeClub(club) });
  } catch (error) {
    console.error("createClub error:", error);
    return res.status(500).json({ message: "Failed to create club" });
  }
};

export const searchClubs = async (
  req: Request<unknown, unknown, unknown, { q?: string; limit?: string }> ,
  res: Response
): Promise<Response> => {
  try {
    const query = req.query.q?.trim();
    if (!query) {
      return res.json({ success: true, data: [] });
    }

    const max = Math.min(Number.parseInt(req.query.limit ?? "20", 10) || 20, 50);
    const normalized = query.toLowerCase();

    const clubs = await Club.find({ searchKeywords: normalized }).limit(max).sort({ createdAt: -1 });

    return res.json({ success: true, data: clubs.map(sanitizeClub) });
  } catch (error) {
    console.error("searchClubs error:", error);
    return res.status(500).json({ message: "Failed to search clubs" });
  }
};

export const getClubById = async (
  req: Request<{ id: string }> ,
  res: Response
): Promise<Response> => {
  try {
    const club = await Club.findById(req.params.id);
    if (!club) {
      return res.status(404).json({ message: "Club not found" });
    }

    const memberCount = await ClubMember.countDocuments({ clubId: club._id });

    return res.json({
      success: true,
      data: {
        ...sanitizeClub(club),
        memberCount,
      },
    });
  } catch (error) {
    console.error("getClubById error:", error);
    return res.status(500).json({ message: "Failed to fetch club" });
  }
};

export const joinClub = async (
  req: AuthenticatedRequest & Request<{ id: string }> ,
  res: Response
): Promise<Response> => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const club = await Club.findById(req.params.id);
    if (!club) {
      return res.status(404).json({ message: "Club not found" });
    }

    const existing = await ClubMember.findOne({ clubId: club._id, userId: req.user._id });
    if (existing) {
      return res.status(200).json({ success: true, data: sanitizeMember(existing, req.user ?? null) });
    }

    const membership = await ClubMember.create({ clubId: club._id, userId: req.user._id, role: "member" });

    return res.status(201).json({ success: true, data: sanitizeMember(membership, req.user ?? null) });
  } catch (error) {
    console.error("joinClub error:", error);
    return res.status(500).json({ message: "Failed to join club" });
  }
};

export const leaveClub = async (
  req: AuthenticatedRequest & Request<{ id: string }> ,
  res: Response
): Promise<Response> => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const club = await Club.findById(req.params.id);
    if (!club) {
      return res.status(404).json({ message: "Club not found" });
    }

    if (club.ownerId.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "Club owners cannot leave their own club" });
    }

    await ClubMember.findOneAndDelete({ clubId: club._id, userId: req.user._id });

    return res.json({ success: true });
  } catch (error) {
    console.error("leaveClub error:", error);
    return res.status(500).json({ message: "Failed to leave club" });
  }
};

export const listClubMembers = async (
  req: Request<{ id: string }, unknown, unknown, { limit?: string }> ,
  res: Response
): Promise<Response> => {
  try {
    const club = await Club.findById(req.params.id);
    if (!club) {
      return res.status(404).json({ message: "Club not found" });
    }

    const max = Math.min(Number.parseInt(req.query.limit ?? "50", 10) || 50, 200);

    const memberships = await ClubMember.find({ clubId: club._id }).sort({ joinedAt: -1 }).limit(max);
    const userIds = memberships.map((membership) => membership.userId);
    const users = await User.find({ _id: { $in: userIds } });
    const usersById = new Map(users.map((user) => [user._id.toString(), user]));

    const payload = memberships.map((membership) =>
      sanitizeMember(membership, usersById.get(membership.userId.toString()))
    );

    return res.json({ success: true, data: payload });
  } catch (error) {
    console.error("listClubMembers error:", error);
    return res.status(500).json({ message: "Failed to list club members" });
  }
};
