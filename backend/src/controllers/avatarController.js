import { uploadImage, deleteImage } from "../services/cloudinaryService.js";
import User from "../models/User.js";
import fs from "fs";

export const uploadAvatar = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("📸 Uploading avatar for:", userId);
    console.log("📁 File received:", req.file);
    const filePath = req.file.path;
    const result = await uploadImage(filePath);
    fs.unlinkSync(filePath);
    const user = await User.findById(userId);
    if (user.avatarPublicId) await deleteImage(user.avatarPublicId);
    user.avatarUrl = result.secure_url;
    user.avatarPublicId = result.public_id;
    user.avatarProvider = "cloudinary";
    await user.save();
    console.log("✅ Avatar upload success:", user.avatarUrl);
    return res.json({ success: true, data: { avatarUrl: user.avatarUrl } });
  } catch (err) {
    console.error("Upload avatar error:", err);
    res.status(500).json({ success: false, message: "Upload failed" });
  }
};

export const deleteAvatar = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.avatarPublicId) return res.status(400).json({ message: "No avatar to delete" });

    await deleteImage(user.avatarPublicId);
    user.avatarUrl = "";
    user.avatarPublicId = "";
    await user.save();

    res.json({ success: true, message: "Avatar deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Delete failed" });
  }
};
