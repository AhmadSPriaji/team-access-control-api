import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { prisma } from "../utils/prisma.js";

export const requireApiKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const apiKeyHeader = req.header("x-api-key");

  if (!apiKeyHeader) {
    res.status(401).json({ status: "fail", message: "API Key is missing" });
    return;
  }

  // Hash the incoming key to compare with the stored hash
  const keyHash = crypto.createHash("sha256").update(apiKeyHeader).digest("hex");

  try {
    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: { organization: true },
    });

    if (!apiKey) {
      res.status(401).json({ status: "fail", message: "Invalid API Key" });
      return;
    }

    // Update last used timestamp (optional, but good for tracking)
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

    next();
  } catch (error) {
    next(error);
  }
};
