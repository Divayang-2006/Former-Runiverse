// src/utils/errors.js

export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode || 500;
    this.isOperational = true; // flag for known handled errors
    Error.captureStackTrace(this, this.constructor);
  }
}

export const handleError = (err, res) => {
  console.error("❌ Error:", err);

  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // For unknown errors (bugs, crashes)
  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
};

// Example usage:
// throw new AppError("Unauthorized access", 401);
// handleError(error, res);
