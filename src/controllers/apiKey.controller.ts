import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { prisma } from "../utils/prisma.js";

export const generateApiKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name } = req.body;
    const orgId = req.params.orgId as string;

    // Generate a secure random API key
    const rawKey = `sk_${crypto.randomBytes(32).toString("hex")}`;
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
    const keyPrefix = rawKey.substring(0, 8); // e.g., sk_1a2b3c

    const apiKey = await prisma.apiKey.create({
      data: {
        name,
        keyHash,
        keyPrefix,
        organizationId: orgId,
      },
    });

    res.status(201).json({
      status: "success",
      message: "API Key generated successfully. Please save it now, it will not be shown again.",
      data: {
        id: apiKey.id,
        name: apiKey.name,
        key: rawKey, // ONLY SHOWN ONCE
        createdAt: apiKey.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const listApiKeys = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const orgId = req.params.orgId as string;

    const apiKeys = await prisma.apiKey.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        createdAt: true,
        lastUsedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      status: "success",
      data: { apiKeys },
    });
  } catch (error) {
    next(error);
  }
};

export const revokeApiKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const orgId = req.params.orgId as string;
    const keyId = req.params.keyId as string;

    await prisma.apiKey.delete({
      where: { id: keyId },
    });

    res.status(200).json({
      status: "success",
      message: "API Key revoked successfully",
    });
  } catch (error) {
    next(error);
  }
};
