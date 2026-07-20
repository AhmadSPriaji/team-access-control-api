import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requirePermission } from "../middlewares/requirePermission.js";
import { getAuditLogs } from "../controllers/auditLog.controller.js";

const router = Router({ mergeParams: true });

/**
 * @swagger
 * /api/organizations/{orgId}/audit-logs:
 *   get:
 *     summary: Retrieve organization audit logs
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by specific action (e.g., 'org.created')
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *         description: Filter by entity type (e.g., 'Organization')
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully
 *       403:
 *         description: Forbidden, insufficient permissions
 */
router.get(
  "/",
  requireAuth,
  requirePermission("audit_logs.read"),
  getAuditLogs
);

export default router;
