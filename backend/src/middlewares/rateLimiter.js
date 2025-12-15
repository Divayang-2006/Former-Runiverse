// src/middlewares/rateLimiter.js
import rateLimit from "express-rate-limit";

// Apply globally or per-route (you can export multiple limiters)

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100, // Limit each IP to 100 requests per window
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 min
  max: 10, // only 10 uploads per 10 minutes
  message: {
    success: false,
    message: "Upload limit reached, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Example usage:
// app.use("/api", generalLimiter);
// router.post("/upload", uploadLimiter, uploadAvatar);
