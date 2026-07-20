import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma.js";

/**
 * Middleware factory for Role-Based Access Control (RBAC).
 * @param allowedRoles Array of role names permitted to access the route (e.g., ['owner', 'admin'])
 */
export const requireRole = (allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          status: "fail",
          message: "Unauthorized: User information missing",
        });
        return;
      }

      const orgId = req.params.orgId as string | undefined;

      if (!orgId || typeof orgId !== "string") {
        res.status(400).json({
          status: "fail",
          message: "Organization ID parameter (orgId) is missing in URL route",
        });
        return;
      }

      // Query membership for user in the given organization, including role
      const membership = await prisma.membership.findFirst({
        where: {
          userId,
          organizationId: orgId,
        },
        include: {
          role: true,
        },
      });

      // User is not a member of this organization
      if (!membership || !membership.role) {
        res.status(403).json({
          status: "fail",
          message: "Forbidden: You are not a member of this organization",
        });
        return;
      }

      // Check if user's role is allowed
      if (!allowedRoles.includes(membership.role.name)) {
        res.status(403).json({
          status: "fail",
          message: "Forbidden: Insufficient role permissions",
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
