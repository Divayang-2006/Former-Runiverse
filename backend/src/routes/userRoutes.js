import express from "express";
import { authMiddleware } from "../middlewares/auth.js";
import {
  getProfile,
  updateProfile,
  syncStats,
  addBadge,
  searchUsers,
} from "../controllers/userController.js";

const router = express.Router();

router.get("/me", authMiddleware, getProfile);
router.put("/me", authMiddleware, updateProfile);
router.put("/me/sync-stats", authMiddleware, syncStats);
router.get("/search", authMiddleware, searchUsers);

export default router;
