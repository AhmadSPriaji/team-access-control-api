import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma.js";
import { logAudit } from "../utils/auditLogger.js";

/**
 * Controller to preview/verify Invitation details (GET).
 */
export const getInvitationDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.query.token as string | undefined;

    if (!token || typeof token !== "string") {
      res.status(400).json({
        status: "fail",
        message: "Invitation token is required in query parameters",
      });
      return;
    }

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!invitation) {
      res.status(404).json({
        status: "fail",
        message: "Invitation token not found",
      });
      return;
    }

    if (invitation.status !== "PENDING") {
      res.status(400).json({
        status: "fail",
        message: `Invitation is no longer valid (status: ${invitation.status})`,
      });
      return;
    }

    if (invitation.expiresAt < new Date()) {
      res.status(400).json({
        status: "fail",
        message: "Invitation token has expired",
      });
      return;
    }

    res.status(200).json({
      status: "success",
      message: "Invitation details retrieved successfully",
      data: {
        id: invitation.id,
        email: invitation.email,
        organization: invitation.organization,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to execute accepting an Organization Invitation (POST).
 */
export const acceptInvitation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Support token from body or query
    const token = (req.body?.token || req.query?.token) as string | undefined;

    if (!token || typeof token !== "string") {
      res.status(400).json({
        status: "fail",
        message: "Invitation token is required",
      });
      return;
    }

    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        status: "fail",
        message: "Unauthorized: User information missing",
      });
      return;
    }

    // Find invitation by token
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        organization: true,
        role: true,
      },
    });

    if (!invitation) {
      res.status(404).json({
        status: "fail",
        message: "Invalid or non-existent invitation token",
      });
      return;
    }

    if (invitation.status !== "PENDING") {
      res.status(400).json({
        status: "fail",
        message: `Invitation cannot be accepted (current status: ${invitation.status})`,
      });
      return;
    }

    if (invitation.expiresAt < new Date()) {
      // Mark as expired in DB
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });

      res.status(400).json({
        status: "fail",
        message: "Invitation token has expired",
      });
      return;
    }

    // Execute atomic transaction to create Membership and mark Invitation as ACCEPTED
    const result = await prisma.$transaction(async (tx) => {
      const membership = await tx.membership.create({
        data: {
          userId,
          organizationId: invitation.organizationId,
          roleId: invitation.roleId,
        },
        include: {
          organization: true,
          role: true,
        },
      });

      const updatedInvitation = await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED" },
      });

      return { membership, invitation: updatedInvitation };
    });

    // Log Audit Event
    await logAudit({
      organizationId: invitation.organizationId,
      userId,
      action: "invitation.accepted",
      entityType: "Membership",
      entityId: result.membership.id,
      details: { roleId: invitation.roleId, roleName: invitation.role?.name, email: invitation.email },
      req,
    });

    res.status(200).json({
      status: "success",
      message: "Invitation accepted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
