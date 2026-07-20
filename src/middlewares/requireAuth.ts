import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JwtUserPayload } from "../types/express.js";

/**
 * Middleware to authenticate requests using JWT Bearer Token.
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      status: "fail",
      message: "Unauthorized: Access token missing or invalid",
    });
    return;
  }

  const token = authHeader.split(" ")[1];
  const jwtSecret = process.env.JWT_SECRET || "default_jwt_secret";

  try {
    const decoded = jwt.verify(token, jwtSecret) as JwtUserPayload;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      status: "fail",
      message: "Unauthorized: Invalid or expired access token",
    });
    return;
  }
};
