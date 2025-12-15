import { Router } from "express";
import { registerUser, loginUser, getAuthenticatedUser, logoutUser } from "../controllers/authController.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", authMiddleware, logoutUser);
router.get("/me", authMiddleware, getAuthenticatedUser);

export default router;
