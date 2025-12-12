import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import {
  claimCell,
  getCell,
  listCellsByBoundingBox,
  listMyCells,
} from "../controllers/territoryCellController.js";

const router = Router();

router.get("/hexes", listCellsByBoundingBox);
router.post("/capture", authMiddleware, claimCell);
router.get("/my", authMiddleware, listMyCells);
router.get("/owner/:hexId", getCell);

export default router;
