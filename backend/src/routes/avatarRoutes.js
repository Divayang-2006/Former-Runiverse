import express from "express";
import multer from "multer";
import { uploadAvatar, deleteAvatar } from "../controllers/avatarController.js";
import { validateImageFile } from "../middlewares/fileValidation.js";
import { authMiddleware } from "../middlewares/auth.js";
import os from "os";

const router = express.Router();
const upload = multer({ dest: os.tmpdir() });

// router.get("/sign", authMiddleware, getSign);
router.post("/upload", authMiddleware, upload.single("avatar"), validateImageFile, uploadAvatar);
router.delete("/delete", authMiddleware, deleteAvatar);

export default router;