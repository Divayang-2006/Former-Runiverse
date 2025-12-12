import { Router } from "express";
import {
  followUser,
  unfollowUser,
  listFollowSuggestions,
} from "../controllers/followController.js";
import {
  createFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  listFriendRequests,
} from "../controllers/friendRequestController.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = Router();

router.post("/follow/:userId", authMiddleware, followUser);
router.delete("/follow/:userId", authMiddleware, unfollowUser);
router.get("/friends/suggestions", authMiddleware, listFollowSuggestions);

router.get("/friend-requests", authMiddleware, listFriendRequests);
router.post("/friend-requests", authMiddleware, createFriendRequest);
router.post("/friend-requests/:id/accept", authMiddleware, acceptFriendRequest);
router.post("/friend-requests/:id/reject", authMiddleware, rejectFriendRequest);

export default router;
