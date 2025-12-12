import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import User, { UserDocument } from "../models/User.js";
import { signAccessToken } from "../services/tokenService.js";
import { buildUserSearchKeywords } from "../services/userService.js";

interface RegisterRequestBody {
  username?: string;
  email?: string;
  password?: string;
}

interface LoginRequestBody {
  identifier?: string;
  password?: string;
}

interface AuthSuccessResponse {
  success: true;
  message: string;
  token?: string;
  user: SanitizedUser;
}

interface AuthErrorResponse {
  success: false;
  message: string;
}

interface AuthenticatedRequest extends Request {
  user?: UserDocument;
}

interface SanitizedUser {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  avatar: string | null;
  bio: string | null;
  mobileNumber: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const sanitizeUser = (user: UserDocument): SanitizedUser => ({
  id: user._id.toString(),
  username: user.username,
  email: user.email,
  displayName: user.displayName ?? null,
  avatar: user.avatar ?? null,
  bio: user.bio ?? null,
  mobileNumber: user.mobileNumber ?? null,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const registerUser = async (
  req: Request<unknown, unknown, RegisterRequestBody>,
  res: Response<AuthSuccessResponse | AuthErrorResponse>
): Promise<Response<AuthSuccessResponse | AuthErrorResponse>> => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: "username, email, and password are required" });
    }

    const normalizedEmail = email.toLowerCase();

    const existingUser = await User.findOne({ $or: [{ email: normalizedEmail }, { username }] });
    if (existingUser) {
      return res.status(409).json({ success: false, message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email: normalizedEmail,
      password: hashedPassword,
      searchKeywords: buildUserSearchKeywords(username),
    });

    const token = signAccessToken(user._id.toString());

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ success: false, message: "Registration failed" });
  }
};

export const getAuthenticatedUser = async (
  req: AuthenticatedRequest,
  res: Response<AuthSuccessResponse | AuthErrorResponse>
): Promise<Response<AuthSuccessResponse | AuthErrorResponse>> => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const freshUser = await User.findById(req.user._id);
    if (!freshUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.json({
      success: true,
      message: "Authenticated user",
      user: sanitizeUser(freshUser),
    });
  } catch (error) {
    console.error("getAuthenticatedUser error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch authenticated user" });
  }
};

export const loginUser = async (
  req: Request<unknown, unknown, LoginRequestBody>,
  res: Response<AuthSuccessResponse | AuthErrorResponse>
): Promise<Response<AuthSuccessResponse | AuthErrorResponse>> => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: "Identifier and password are required" });
    }

    const trimmedIdentifier = identifier.trim();
    if (trimmedIdentifier.length === 0) {
      return res.status(400).json({ success: false, message: "Identifier and password are required" });
    }

    const normalizedEmail = trimmedIdentifier.toLowerCase();

    const user = await User.findOne(
      trimmedIdentifier.includes("@")
        ? { email: normalizedEmail }
        : { username: trimmedIdentifier }
    );
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = signAccessToken(user._id.toString());

    return res.json({
      success: true,
      message: "Login successful",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ success: false, message: "Login failed" });
  }
};
