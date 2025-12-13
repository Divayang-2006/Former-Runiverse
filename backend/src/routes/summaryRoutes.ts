import { Router } from "express";
import {
  getDailySummary,
  getStreakSummary,
  getWeeklySummary,
  runDailyCron,
  runWeeklyCron,
} from "../controllers/summaryController.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = Router();

router.get("/streak", authMiddleware, getStreakSummary);
router.get("/daily", getDailySummary);
router.get("/weekly", getWeeklySummary);
router.post("/run-daily-cron", runDailyCron);
router.post("/run-weekly-cron", runWeeklyCron);

export default router;
