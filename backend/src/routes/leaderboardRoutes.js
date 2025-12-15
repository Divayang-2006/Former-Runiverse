import express from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { getLeaderboard, getCityLeaderboard } from "../controllers/leaderboardController.js";

const router = express.Router();
router.get("/", authMiddleware, getLeaderboard);
router.get("/city", authMiddleware, getCityLeaderboard);

export default router;
