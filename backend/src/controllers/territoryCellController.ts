import type { Request, Response } from "express";
import TerritoryCell from "../models/TerritoryCell.js";
import type { UserDocument } from "../models/User.js";

interface AuthenticatedRequest extends Request {
  user?: UserDocument;
}

interface ClaimCellBody {
  hexId?: string;
  ownerId?: string | null;
  ownerType?: "user" | "club" | null;
}

export const claimCell = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { hexId, ownerId, ownerType = "user" } = req.body as ClaimCellBody;

    if (!hexId) {
      return res.status(400).json({ message: "hexId is required" });
    }

    let resolvedOwnerId = ownerId;
    if (!resolvedOwnerId && ownerType === "user") {
      resolvedOwnerId = req.user._id.toString();
    }

    const now = new Date();

    const cell = await TerritoryCell.findOneAndUpdate(
      { hexId },
      {
        $setOnInsert: { firstCapturedAt: now },
        $set: {
          ownerId: resolvedOwnerId ?? null,
          ownerType: resolvedOwnerId ? ownerType : null,
          lastCapturedAt: now,
        },
        $inc: { captureCount: 1 },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(201).json({ success: true, data: cell });
  } catch (error) {
    console.error("claimCell error:", error);
    return res.status(500).json({ message: "Failed to claim cell" });
  }
};

export const getCell = async (req: Request<{ hexId: string }>, res: Response): Promise<Response> => {
  try {
    const cell = await TerritoryCell.findOne({ hexId: req.params.hexId });
    if (!cell) {
      return res.status(404).json({ message: "Territory cell not found" });
    }

    return res.json({ success: true, data: cell });
  } catch (error) {
    console.error("getCell error:", error);
    return res.status(500).json({ message: "Failed to fetch territory cell" });
  }
};

export const listOwnedCells = async (
  req: Request<unknown, unknown, unknown, { ownerId?: string; ownerType?: "user" | "club"; limit?: string }>,
  res: Response
): Promise<Response> => {
  try {
    const { ownerId, ownerType, limit } = req.query;
    const filter: Record<string, unknown> = {};

    if (ownerId) {
      filter.ownerId = ownerId;
    }

    if (ownerType) {
      filter.ownerType = ownerType;
    }

    const max = Math.min(Number.parseInt(limit ?? "100", 10) || 100, 500);

    const cells = await TerritoryCell.find(filter).limit(max).sort({ lastCapturedAt: -1 });

    return res.json({ success: true, data: cells });
  } catch (error) {
    console.error("listOwnedCells error:", error);
    return res.status(500).json({ message: "Failed to list territory cells" });
  }
};

export const listCellsByBoundingBox = async (
  req: Request<unknown, unknown, unknown, { bbox?: string; limit?: string }> ,
  res: Response
): Promise<Response> => {
  try {
    const { bbox, limit } = req.query;
    const max = Math.min(Number.parseInt(limit ?? "250", 10) || 250, 500);

    let filter: Record<string, unknown> = {};

    if (bbox) {
      const hexIds = bbox
        .split(",")
        .map((hex) => hex.trim())
        .filter((hex) => hex.length > 0);

      if (hexIds.length > 0) {
        filter = { hexId: { $in: hexIds } };
      }
    }

    const cells = await TerritoryCell.find(filter).limit(max).sort({ lastCapturedAt: -1 });

    return res.json({ success: true, data: cells });
  } catch (error) {
    console.error("listCellsByBoundingBox error:", error);
    return res.status(500).json({ message: "Failed to list territory cells" });
  }
};

export const listMyCells = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const cells = await TerritoryCell.find({ ownerId: req.user._id }).sort({ lastCapturedAt: -1 });

    return res.json({ success: true, data: cells });
  } catch (error) {
    console.error("listMyCells error:", error);
    return res.status(500).json({ message: "Failed to list owned territory" });
  }
};
