import { Router } from "express";
import { createActivity, addActivityStream, getActivityById } from "../controllers/activityController.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = Router();

router.post("/", authMiddleware, createActivity);
router.post("/:id/streams", authMiddleware, addActivityStream);
router.get("/:id", authMiddleware, getActivityById);

export default router;
