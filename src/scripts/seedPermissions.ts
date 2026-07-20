import { prisma } from "../utils/prisma.js";

const MASTER_PERMISSIONS = [
  { action: "org.read", description: "View organization details" },
  { action: "org.update", description: "Update organization details" },
  { action: "org.delete", description: "Delete organization (Owner only)" },
  { action: "users.read", description: "View organization members" },
  { action: "users.invite", description: "Invite new team members" },
  { action: "users.remove", description: "Remove team members" },
  { action: "users.role.update", description: "Update team member roles" },
  { action: "projects.read", description: "View projects" },
  { action: "projects.write", description: "Create and update projects" },
  { action: "billing.read", description: "View billing information" },
  { action: "billing.update", description: "Update billing and subscription (Owner only)" },
  { action: "audit_logs.read", description: "View organization audit logs" },
];

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
  ],
  member: ["org.read", "users.read", "projects.read", "projects.write"],
  viewer: ["org.read", "users.read", "projects.read"],
};

export async function seedPermissions() {
  console.log("🌱 Seeding Master Permissions...");

  // 1. Seed Permission Master Table
  const permissionMap = new Map<string, string>();

  for (const perm of MASTER_PERMISSIONS) {
    const existing = await prisma.permission.findUnique({
      where: { action: perm.action },
    });

    if (existing) {
      permissionMap.set(perm.action, existing.id);
    } else {
      const created = await prisma.permission.create({
        data: perm,
      });
      permissionMap.set(perm.action, created.id);
      console.log(`  + Permission created: ${perm.action}`);
    }
  }

  console.log("🔗 Mapping Permissions to Roles for all existing Organizations...");

  // 2. Query all Roles in the Database
  const allRoles = await prisma.role.findMany();

  for (const role of allRoles) {
    const roleNameLower = role.name.toLowerCase();
    const allowedActions = ROLE_PERMISSIONS_MAP[roleNameLower] || [];

    for (const actionName of allowedActions) {
      const permissionId = permissionMap.get(actionName);

      if (permissionId) {
        // Upsert RolePermission entry
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId,
          },
        });
      }
    }
    console.log(`  ✓ Mapped ${allowedActions.length} permissions to Role '${role.name}' (ID: ${role.id})`);
  }

  console.log("✅ Seeding completed successfully!");
}

import { fileURLToPath } from "url";

// Run script if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedPermissions()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Error seeding permissions:", err);
      process.exit(1);
    });
}
