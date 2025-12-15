// src/utils/validators.js

// Basic email regex (you can strengthen this)
export const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const isValidPassword = (password) => {
  return typeof password === "string" && password.length >= 6;
};

export const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Image MIME validation helper (if not handled by Multer)
export const isValidImageMime = (mimetype) => {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  return allowed.includes(mimetype);
};

// Generic object check
export const hasRequiredFields = (obj, fields = []) => {
  return fields.every((field) => obj[field] !== undefined && obj[field] !== null);
};
