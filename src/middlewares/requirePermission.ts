import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma.js";

import { fetchWithCache } from "../utils/cache.js";

/**
 * Middleware factory for Fine-Grained Permission-Based Access Control (PBAC).
 * @param requiredPermission The required permission action string (e.g., 'projects.write', 'users.invite')
 */
export const requirePermission = (requiredPermission: string) => {
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

      // Gunakan Redis Cache untuk mengambil permissions!
      const cacheKey = `permissions:${orgId}:${userId}`;
      const membership = await fetchWithCache(
        cacheKey,
        async () => {
          return await prisma.membership.findFirst({
            where: {
              userId,
              organizationId: orgId,
            },
            include: {
              role: {
                include: {
                  permissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          });
        }
      );

      // User is not a member of this organization
      if (!membership || !membership.role) {
        res.status(403).json({
          status: "fail",
          message: "Forbidden: You are not a member of this organization",
        });
        return;
      }

      // Find the specific RolePermission for the required action
      const rolePermission = membership.role.permissions.find(
        (rp) => rp.permission.action === requiredPermission
      );

      if (!rolePermission) {
        res.status(403).json({
          status: "fail",
          message: `Forbidden: You do not have the required permission '${requiredPermission}'`,
        });
        return;
      }

      // ABAC: Evaluate conditions if they exist
      if (rolePermission.conditions && typeof rolePermission.conditions === "object") {
        const conditions = rolePermission.conditions as Record<string, string>;
        
        for (const [keyPath, expectedTemplate] of Object.entries(conditions)) {
          // Resolve actual value from `req` object (e.g. "params.projectId")
          const actualValue = keyPath.split('.').reduce((obj: any, key) => obj?.[key], req);
          
          let expectedValue = expectedTemplate;
          // Resolve dynamic template values (e.g. "{{user.userId}}")
          if (typeof expectedTemplate === "string" && expectedTemplate.startsWith("{{") && expectedTemplate.endsWith("}}")) {
            const varPath = expectedTemplate.slice(2, -2).trim();
            expectedValue = varPath.split('.').reduce((obj: any, key) => obj?.[key], req);
          }

          if (actualValue !== expectedValue) {
            res.status(403).json({
              status: "fail",
              message: `Forbidden: ABAC condition failed for '${keyPath}'`,
            });
            return;
          }
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
