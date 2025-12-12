import { Router } from "express";
import { registerUser, loginUser, getAuthenticatedUser } from "../controllers/authController.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", authMiddleware, getAuthenticatedUser);

export default router;
