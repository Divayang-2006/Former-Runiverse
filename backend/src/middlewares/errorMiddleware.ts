import type { Request, Response, NextFunction } from "express";

export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

export const errorHandler = (err: Error & { statusCode?: number }, _req: Request, res: Response, _next: NextFunction): void => {
  console.error("Error middleware:", err.stack);
  const statusCode = res.statusCode === 200 ? err.statusCode ?? 500 : res.statusCode;
  res.status(statusCode).json({
    success: false,
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};
