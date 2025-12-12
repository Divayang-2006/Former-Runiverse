import { Router } from "express";
import {
  getDailySummary,
  getWeeklySummary,
  runDailyCron,
  runWeeklyCron,
} from "../controllers/summaryController.js";

const router = Router();

router.get("/daily", getDailySummary);
router.get("/weekly", getWeeklySummary);
router.post("/run-daily-cron", runDailyCron);
router.post("/run-weekly-cron", runWeeklyCron);

export default router;
