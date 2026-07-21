import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma.js";
import { logAudit } from "../utils/auditLogger.js";
import { fetchWithCache, invalidateCache } from "../utils/cache.js";

/**
 * Controller to create a new Project inside an Organization.
 */
export const createProject = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const orgId = req.params.orgId as string;
    const { name, description } = req.body;

    const project = await prisma.project.create({
      data: {
        organizationId: orgId,
        name,
        description,
      },
    });

    // Invalidate cache since a new project is created
    await invalidateCache(`projects:org:${orgId}`);

    // Log Audit Event
    await logAudit({
      organizationId: orgId,
      userId: req.user?.userId,
      action: "project.created",
      entityType: "Project",
      entityId: project.id,
      details: { name: project.name },
      req,
    });

    res.status(201).json({
      status: "success",
      message: "Project created successfully",
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to get all Projects in an Organization.
 */
export const getProjects = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const orgId = req.params.orgId as string;
    
    const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt((req.query.limit as string) || "20", 10)));
    const skip = (page - 1) * limit;

    const cacheKey = `projects:org:${orgId}:page:${page}:limit:${limit}`;

    const [projects, total] = await fetchWithCache(
      cacheKey,
      async () => {
        return await Promise.all([
          prisma.project.findMany({
            where: {
              organizationId: orgId,
            },
            skip,
            take: limit,
            orderBy: {
              createdAt: "desc",
            },
          }),
          prisma.project.count({
            where: { organizationId: orgId },
          }),
        ]);
      }
    );

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      status: "success",
      data: projects,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};
