import express from "express";
import { authMiddleware } from "../middlewares/auth.js";
import {
  createTask,
  getTasks,
  getTaskById,
  markTaskCompleted,
  deleteTask,
  generateAITask,
} from "../controllers/taskController.js";

const router = express.Router();

router.post("/", authMiddleware, createTask);
router.get("/", authMiddleware, getTasks);
router.get("/:id", authMiddleware, getTaskById);
router.put("/:id/complete", authMiddleware, markTaskCompleted);
router.delete("/:id", authMiddleware, deleteTask);
router.post("/generate-ai", authMiddleware, generateAITask); // 👈 AI task route

export default router;
