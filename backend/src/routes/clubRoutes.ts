import { Router } from "express";
import {
  createClub,
  searchClubs,
  getClubById,
  joinClub,
  leaveClub,
  listClubMembers,
} from "../controllers/clubController.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = Router();

router.post("/", authMiddleware, createClub);
router.get("/search", searchClubs);
router.get("/:id/members", listClubMembers);
router.post("/:id/join", authMiddleware, joinClub);
router.post("/:id/leave", authMiddleware, leaveClub);
router.get("/:id", getClubById);

export default router;
