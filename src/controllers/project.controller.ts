import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma.js";
import { logAudit } from "../utils/auditLogger.js";

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

    const projects = await prisma.project.findMany({
      where: {
        organizationId: orgId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      status: "success",
      data: projects,
    });
  } catch (error) {
    next(error);
  }
};
