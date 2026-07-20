import { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError.js";

/**
 * Global error handler middleware for Express.
 */
export const errorHandler: ErrorRequestHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId = (req as any).id || "unknown";

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.errorCode,
        message: err.message,
        details: err.details,
        requestId,
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request payload",
        details: err.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
        requestId,
      },
    });
    return;
  }

  // Handle Prisma Errors if they bubble up (optional, just generic error is fine if unhandled)
  if (err?.code && err?.clientVersion) { // simple Prisma error duck-typing
    console.error(`[${requestId}] Prisma Error:`, err);
    res.status(400).json({
      error: {
        code: "DATABASE_ERROR",
        message: "A database operation failed",
        requestId,
      },
    });
    return;
  }

  // Log unexpected errors for debugging
  console.error(`[${requestId}] Unhandled Error:`, err);

  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal Server Error",
      requestId,
    },
  });
};
