import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { searchUsers, getUserById, updateProfile, uploadAvatar, getCurrentUser, deleteAccount, getActivityStats } from "../controllers/userController.js";
import { listActivitiesForUser } from "../controllers/activityController.js";
import { listFollowers, listFollowing } from "../controllers/followController.js";
import { avatarUploadMiddleware } from "../middlewares/upload.js";

const router = Router();

router.get("/search", searchUsers);
router.get("/me", authMiddleware, getCurrentUser);
router.put("/me", authMiddleware, updateProfile);
router.get("/me/activity-stats", authMiddleware, getActivityStats);
router.post("/me/avatar", authMiddleware, avatarUploadMiddleware, uploadAvatar);
router.delete("/me", authMiddleware, deleteAccount);
router.get("/:id/activities", listActivitiesForUser);
router.get("/:id/followers", listFollowers);
router.get("/:id/following", listFollowing);
router.get("/:id", getUserById);

export default router;
