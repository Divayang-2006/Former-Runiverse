import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import {
  detectRoutes,
  getNearbyRoutes,
  getRouteById,
  saveRouteForUser,
  listRoutesByUser,
  createRoute,
} from "../controllers/routeController.js";

const router = Router();

router.post("/detect", authMiddleware, detectRoutes);
router.get("/nearby", getNearbyRoutes);
router.get("/user/:id", listRoutesByUser);
router.get("/:id", getRouteById);
router.post("/:id/save", authMiddleware, saveRouteForUser);

// Optional: allow creators to author new routes
router.post("/", authMiddleware, createRoute);

export default router;
