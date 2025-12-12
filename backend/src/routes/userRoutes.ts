import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { searchUsers, getUserById, updateProfile, uploadAvatar } from "../controllers/userController.js";
import { listActivitiesForUser } from "../controllers/activityController.js";
import { listFollowers, listFollowing } from "../controllers/followController.js";
import { avatarUploadMiddleware } from "../middlewares/upload.js";

const router = Router();

router.get("/search", searchUsers);
router.get("/:id/activities", listActivitiesForUser);
router.get("/:id/followers", listFollowers);
router.get("/:id/following", listFollowing);
router.get("/:id", getUserById);
router.put("/me", authMiddleware, updateProfile);
router.post("/me/avatar", authMiddleware, avatarUploadMiddleware, uploadAvatar);

export default router;
