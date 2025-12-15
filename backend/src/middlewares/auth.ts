import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User, { UserDocument } from "../models/User.js";
import { verifyAccessToken } from "../services/tokenService.js";

interface JwtPayload {
  id: string;
}

type AuthenticatedRequest = Request & {
  user?: UserDocument;
};

const { TokenExpiredError } = jwt;

const respondUnauthorized = (res: Response, message: string): Response => {
  res.setHeader("WWW-Authenticate", "Bearer realm=\"Runiverse\"");
  return res.status(401).json({ success: false, message });
};

const extractToken = (req: AuthenticatedRequest): string | null => {
  const authHeader = req.headers.authorization;
  if (typeof authHeader !== "string" || authHeader.length === 0) {
    return null;
  }

  const [scheme, rawToken] = authHeader.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer") {
    return null;
  }

  if (!rawToken) {
    return null;
  }

  const token = rawToken.trim();
  if (!token || token === "null" || token === "undefined") {
    return null;
  }

  return token;
};

export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<Response | void> => {
  const token = extractToken(req);
  if (!token) {
    return respondUnauthorized(res, "No token provided");
  }

  try {
    const decoded = verifyAccessToken<JwtPayload>(token);
    if (!decoded?.id) {
      return respondUnauthorized(res, "Token payload is not valid");
    }

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return respondUnauthorized(res, "User not found");
    }

    req.user = user;
    return next();
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    const message = error instanceof TokenExpiredError ? "Token has expired" : "Token is not valid";
    console.error("Auth error:", error.message);
    return respondUnauthorized(res, message);
  }
};
