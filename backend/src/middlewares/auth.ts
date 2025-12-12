import type { Request, Response, NextFunction } from "express";
import User, { UserDocument } from "../models/User.js";
import { verifyAccessToken } from "../services/tokenService.js";

interface AuthenticatedRequest extends Request {
  user?: UserDocument;
}

interface JwtPayload {
  id: string;
}

export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<Response | void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyAccessToken<JwtPayload>(token);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    req.user = user;
    return next();
  } catch (err) {
    console.error("Auth error:", err);
    return res.status(401).json({ success: false, message: "Token is not valid" });
  }
};
