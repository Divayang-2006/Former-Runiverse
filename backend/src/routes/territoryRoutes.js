import express from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { claimTerritory, getTerritories } from "../controllers/territoryController.js";

const router = express.Router();
router.get("/", getTerritories);
router.post("/claim", authMiddleware, claimTerritory);

export default router;
