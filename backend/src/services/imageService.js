export const getThumbnailUrl = (publicId, size = 100) =>
  cloudinary.url(publicId, { width: size, height: size, crop: "thumb", gravity: "face" });
