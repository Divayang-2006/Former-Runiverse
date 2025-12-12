import multer from "multer";
import type { Request } from "express";

const memoryStorage = multer.memoryStorage();

const imageFileFilter = (_req: Request, file: Express.Multer.File, callback: multer.FileFilterCallback): void => {
  if (!file.mimetype.startsWith("image/")) {
    callback(new Error("Only image files are allowed"));
    return;
  }
  callback(null, true);
};

export const avatarUploadMiddleware = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFileFilter,
}).single("avatar");
