export const validateImageFile = (req, res, next) => {
  const file = req.file;
  if (!file) return res.status(400).json({ message: "No file uploaded" });

  const validTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!validTypes.includes(file.mimetype))
    return res.status(400).json({ message: "Invalid file type" });

  if (file.size > 5 * 1024 * 1024)
    return res.status(400).json({ message: "File too large (max 5MB)" });

  next();
};
