import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

const createPrismaClient = () => {
  const baseClient = new PrismaClient({ adapter });
  
  return baseClient.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // Hanya terapkan soft delete ke entitas yang punya deletedAt
          if (model === 'User' || model === 'Organization') {
            if (operation === 'findUnique' || operation === 'findFirst' || operation === 'findMany') {
              args.where = { ...args.where, deletedAt: null } as any;
            }
            if (operation === 'delete') {
              return (baseClient as any)[model].update({
                where: args.where,
                data: { deletedAt: new Date() },
              });
            }
            if (operation === 'deleteMany') {
              return (baseClient as any)[model].updateMany({
                where: args.where,
                data: { deletedAt: new Date() },
              });
            }
          }
          return query(args);
        }
      }
    }
  });
};

const globalForPrisma = global as unknown as { prisma: ReturnType<typeof createPrismaClient> };

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
