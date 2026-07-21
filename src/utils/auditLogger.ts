import { Request } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

export interface LogAuditParams {
  organizationId?: string;
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, any>;
  req?: Request;
}

/**
 * Asynchronously log user or system activity into AuditLog table.
 * Designed to be non-blocking (safely catches any DB errors so core flows are never interrupted).
 */
export const logAudit = async (params: LogAuditParams): Promise<void> => {
  try {
    const { organizationId, userId, action, entityType, entityId, details, req } = params;

    let ipAddress: string | undefined = undefined;
    let userAgent: string | undefined = undefined;

    if (req) {
      const forwardedFor = req.headers["x-forwarded-for"];
      if (typeof forwardedFor === "string") {
        ipAddress = forwardedFor.split(",")[0].trim();
      } else if (Array.isArray(forwardedFor)) {
        ipAddress = forwardedFor[0];
      } else {
        ipAddress = req.ip || req.socket.remoteAddress || undefined;
      }
      userAgent = req.headers["user-agent"] || undefined;
    }

    let actualUserId = userId;
    let actualDetails = { ...details };

    // Handle Machine-to-Machine (API Key) requests where userId is pseudo 'm2m-{id}'
    if (userId?.startsWith("m2m-")) {
      actualUserId = undefined; // Do not use it for relation
      actualDetails = {
        ...actualDetails,
        apiKeyId: userId.replace("m2m-", ""),
        isM2M: true,
      };
    }

    await prisma.auditLog.create({
      data: {
        organizationId: organizationId ?? null,
        userId: actualUserId ?? null,
        action,
        entityType: entityType ?? null,
        entityId: entityId ?? null,
        details: (Object.keys(actualDetails).length > 0 ? actualDetails : null) as Prisma.InputJsonValue,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      },
    });
  } catch (error) {
    console.error("⚠️ Failed to record AuditLog:", error);
  }
};
