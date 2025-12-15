import express from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { getChallenges, updateChallengeProgress } from "../controllers/challengeController.js";

const router = express.Router();
router.get("/", authMiddleware, getChallenges);
router.put("/progress", authMiddleware, updateChallengeProgress);

export default router;
