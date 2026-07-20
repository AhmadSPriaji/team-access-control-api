import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

import { prisma } from "../src/utils/prisma.js";
import { seedPermissions } from "../src/scripts/seedPermissions.js";
import { redisClient } from "../src/utils/redis.js";

beforeAll(async () => {
  // Clear the entire test database
  await prisma.auditLog.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.project.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.session.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();

  // Re-seed master permissions
  await seedPermissions();
});

afterAll(async () => {
  await prisma.$disconnect();
  if (redisClient.isOpen) {
    await redisClient.disconnect();
  }
});
