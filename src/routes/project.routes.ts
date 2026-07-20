import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requirePermission } from "../middlewares/requirePermission.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { createProjectSchema } from "../schemas/project.schema.js";
import { createProject, getProjects } from "../controllers/project.controller.js";

const router = Router({ mergeParams: true });

/**
 * @swagger
 * /api/organizations/{orgId}/projects:
 *   post:
 *     summary: Create a new project in the organization
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Website Redesign"
 *               description:
 *                 type: string
 *                 example: "Redesigning the main corporate website."
 *     responses:
 *       201:
 *         description: Project created successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden, insufficient permissions
 */
router.post(
  "/",
  requireAuth,
  requirePermission("projects.write"),
  validateRequest(createProjectSchema),
  createProject
);

/**
 * @swagger
 * /api/organizations/{orgId}/projects:
 *   get:
 *     summary: Get all projects in the organization
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization ID
 *     responses:
 *       200:
 *         description: List of projects retrieved successfully
 *       403:
 *         description: Forbidden, insufficient permissions
 */
router.get(
  "/",
  requireAuth,
  requirePermission("projects.read"),
  getProjects
);

export default router;
