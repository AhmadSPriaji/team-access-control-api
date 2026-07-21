import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { prisma } from "../utils/prisma.js";
import { logAudit } from "../utils/auditLogger.js";
import { invalidateCache } from "../utils/cache.js";

const ROLE_PERMISSIONS_MAP: Record<string, string[]> = {
  owner: [
    "org.read",
    "org.update",
    "org.delete",
    "users.read",
    "users.invite",
    "users.remove",
    "users.role.update",
    "projects.read",
    "projects.write",
    "billing.read",
    "billing.update",
    "audit_logs.read",
    "apikeys.read",
    "apikeys.create",
    "apikeys.delete",
  ],
  admin: [
    "org.read",
    "org.update",
    "users.read",
    "users.invite",
    "users.remove",
    "users.role.update",
    "projects.read",
    "projects.write",
    "billing.read",
    "audit_logs.read",
    "apikeys.read",
  ],
  member: ["org.read", "users.read", "projects.read", "projects.write"],
  viewer: ["org.read", "users.read", "projects.read"],
};

/**
 * Controller to create a new Organization and set the creator as owner.
 * Also creates default roles (owner, admin, member, viewer) and attaches their permissions.
 */
export const createOrganization = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        status: "fail",
        message: "Unauthorized: User information missing",
      });
      return;
    }

    const { name } = req.body;

    // Fetch all master permissions
    const permissions = await prisma.permission.findMany();
    const permMap = new Map(permissions.map((p) => [p.action, p.id]));

    // Execute atomic transaction for Organization, Default Roles, RolePermissions, and Membership creation
    const newOrganization = await prisma.$transaction(async (tx) => {
      // a. Create new Organization entity
      const organization = await tx.organization.create({
        data: { name },
      });

      // b. Helper function to create role and map permissions
      const createRoleWithPermissions = async (roleName: string) => {
        const role = await tx.role.create({
          data: {
            name: roleName,
            organizationId: organization.id,
          },
        });

        const allowedActions = ROLE_PERMISSIONS_MAP[roleName] || [];
        const rolePermissionsData = allowedActions
          .map((action) => permMap.get(action))
          .filter((permId): permId is string => Boolean(permId))
          .map((permissionId) => ({
            roleId: role.id,
            permissionId,
          }));

        if (rolePermissionsData.length > 0) {
          await tx.rolePermission.createMany({
            data: rolePermissionsData,
          });
        }

        return role;
      };

      // Create owner role with permissions
      const ownerRole = await createRoleWithPermissions("owner");

      // Create admin, member, and viewer roles with permissions
      await createRoleWithPermissions("admin");
      await createRoleWithPermissions("member");
      await createRoleWithPermissions("viewer");

      // c. Create Membership linking userId, organizationId, and owner roleId
      await tx.membership.create({
        data: {
          userId,
          organizationId: organization.id,
          roleId: ownerRole.id,
        },
      });

      return organization;
    });

    // Log Audit Event
    await logAudit({
      organizationId: newOrganization.id,
      userId,
      action: "org.created",
      entityType: "Organization",
      entityId: newOrganization.id,
      details: { name: newOrganization.name },
      req,
    });

    res.status(201).json({
      status: "success",
      message: "Organization created successfully with default roles and permission mappings",
      data: newOrganization,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to invite a new user to an Organization.
 * Accepts roleId OR roleName (defaults to 'member' if unspecified).
 */
export const inviteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const orgId = req.params.orgId as string;
    const { email, roleId, roleName } = req.body;

    // Check if Organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!organization) {
      res.status(404).json({
        status: "fail",
        message: "Organization not found",
      });
      return;
    }

    let targetRole = null;

    // Find role by roleId if provided
    if (roleId) {
      targetRole = await prisma.role.findUnique({
        where: { id: roleId },
      });

      if (!targetRole) {
        res.status(404).json({
          status: "fail",
          message: "Specified Role ID not found",
        });
        return;
      }
    } else {
      // Use roleName or default to 'member'
      const searchRoleName = (roleName || "member").toLowerCase();

      // Find role by name within this organization
      targetRole = await prisma.role.findFirst({
        where: {
          organizationId: orgId,
          name: searchRoleName,
        },
      });

      // If role does not exist yet for this org, auto-create it
      if (!targetRole) {
        targetRole = await prisma.role.create({
          data: {
            name: searchRoleName,
            organizationId: orgId,
          },
        });
      }
    }

    // Check if user is already a member of this organization
    const existingMembership = await prisma.membership.findFirst({
      where: {
        organizationId: orgId,
        user: {
          email,
        },
      },
    });

    if (existingMembership) {
      res.status(400).json({
        status: "fail",
        message: "User is already a member of this organization",
      });
      return;
    }

    // Generate unique random token (hex string)
    const token = crypto.randomBytes(32).toString("hex");

    // Expiration date: 7 days from now
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Create Invitation record in DB
    const invitation = await prisma.invitation.create({
      data: {
        organizationId: orgId,
        email,
        roleId: targetRole.id,
        token,
        expiresAt,
        status: "PENDING",
      },
      include: {
        role: true,
      },
    });

    // Log Audit Event
    await logAudit({
      organizationId: orgId,
      userId: req.user?.userId,
      action: "user.invited",
      entityType: "Invitation",
      entityId: invitation.id,
      details: { email, roleName: targetRole.name, roleId: targetRole.id },
      req,
    });

    res.status(201).json({
      status: "success",
      message: `Invitation created successfully for role '${targetRole.name}'`,
      data: invitation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to update a member's role in an organization.
 */
export const updateMemberRole = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const orgId = req.params.orgId as string;
    const memberId = req.params.memberId as string;
    const { roleId } = req.body;

    // 1. Validate Target Role
    const newRole = await prisma.role.findFirst({
      where: {
        id: roleId,
        OR: [{ organizationId: null }, { organizationId: orgId }],
      },
    });

    if (!newRole) {
      res.status(404).json({ status: "fail", message: "Role not found" });
      return;
    }

    // 2. Fetch Membership
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: memberId,
          organizationId: orgId,
        },
      },
      include: {
        role: true,
      },
    });

    if (!membership) {
      res.status(404).json({ status: "fail", message: "Member not found in this organization" });
      return;
    }

    // 3. Prevent updating the role of an 'owner'
    if (membership.role.name.toLowerCase() === "owner") {
      res.status(400).json({
        status: "fail",
        message: "Cannot change the role of an owner",
      });
      return;
    }

    // 4. Update Membership Role
    const updatedMembership = await prisma.membership.update({
      where: { id: membership.id },
      data: { roleId: newRole.id },
    });

    // Invalidate cached permissions for this user in this organization
    await invalidateCache(`permissions:${orgId}:${memberId}`);

    // 5. Audit Logging
    await logAudit({
      organizationId: orgId,
      userId: req.user?.userId,
      action: "role.changed",
      entityType: "Membership",
      entityId: membership.id,
      details: {
        memberId,
        oldRoleId: membership.roleId,
        oldRoleName: membership.role.name,
        newRoleId: newRole.id,
        newRoleName: newRole.name,
      },
      req,
    });

    res.status(200).json({
      status: "success",
      message: "Member role updated successfully",
      data: updatedMembership,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to list organizations with pagination and search.
 * Only returns organizations where the user is a member.
 */
export const listOrganizations = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ status: "fail", message: "Unauthorized" });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;

    const skip = (page - 1) * limit;

    const whereClause: any = {
      memberships: {
        some: { userId },
      },
    };

    if (search) {
      whereClause.name = {
        contains: search,
        mode: "insensitive",
      };
    }

    const [total, organizations] = await prisma.$transaction([
      prisma.organization.count({ where: whereClause }),
      prisma.organization.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    res.status(200).json({
      status: "success",
      data: organizations,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};
