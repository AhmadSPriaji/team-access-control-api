import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../utils/prisma.js";
import { JwtUserPayload } from "../types/express.js";

/**
 * Middleware to authenticate requests using either JWT Bearer Token or x-api-key header.
 */
export const requireAuthOrApiKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  const apiKeyHeader = req.header("x-api-key");

  // 1. Try API Key if provided
  if (apiKeyHeader) {
    const keyHash = crypto.createHash("sha256").update(apiKeyHeader).digest("hex");
    try {
      const apiKey = await prisma.apiKey.findUnique({
        where: { keyHash },
        include: {
          organization: true,
          role: {
            include: {
              permissions: {
                include: { permission: true },
              },
            },
          },
        },
      });

      if (!apiKey) {
        res.status(401).json({ status: "fail", message: "Invalid API Key" });
        return;
      }

      // Update last used timestamp
      await prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      });

      // Attach organization context to the request (since M2M keys are usually tied to an org)
      req.user = {
        userId: `m2m-${apiKey.id}`, // pseudo-user ID for M2M
        email: `m2m@${apiKey.organization.id}`, // pseudo-email
        organizationId: apiKey.organizationId,
      };
      
      // Also attach api key details for specific logic if needed
      (req as any).apiKey = apiKey;
      
      return next();
    } catch (error) {
      return next(error);
    }
  }

  // 2. Try JWT if provided
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    const jwtSecret = process.env.JWT_SECRET || "default_jwt_secret";

    try {
      const decoded = jwt.verify(token, jwtSecret) as JwtUserPayload;
      req.user = decoded;
      return next();
    } catch (error) {
      res.status(401).json({
        status: "fail",
        message: "Unauthorized: Invalid or expired access token",
      });
      return;
    }
  }

  // 3. Fallback
  res.status(401).json({
    status: "fail",
    message: "Unauthorized: Missing authentication (JWT or API Key required)",
  });
};
