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
    const cacheKey = `projects:org:${orgId}`;

    const projects = await fetchWithCache(
      cacheKey,
      async () => {
        return await prisma.project.findMany({
          where: {
            organizationId: orgId,
          },
          orderBy: {
            createdAt: "desc",
          },
        });
      }
    );

    res.status(200).json({
      status: "success",
      data: projects,
    });
  } catch (error) {
    next(error);
  }
};
