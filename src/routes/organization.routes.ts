import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requirePermission } from "../middlewares/requirePermission.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { createOrganizationSchema } from "../schemas/organization.schema.js";
import { inviteUserSchema } from "../schemas/invitation.schema.js";
import { createOrganization, inviteUser, updateMemberRole, listOrganizations } from "../controllers/organization.controller.js";
import { generateApiKey, listApiKeys, revokeApiKey } from "../controllers/apiKey.controller.js";
import { generateApiKeySchema } from "../schemas/apiKey.schema.js";

const router = Router();

/**
 * @swagger
 * /api/organizations:
 *   post:
 *     summary: Create a new organization
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
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
 *                 example: "Acme Corp"
 *     responses:
 *       201:
 *         description: Organization created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/",
  requireAuth,
  validateRequest(createOrganizationSchema),
  createOrganization
);

/**
 * @swagger
 * /api/organizations:
 *   get:
 *     summary: List organizations with pagination and search
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of organizations
 */
router.get(
  "/",
  requireAuth,
  listOrganizations
);

/**
 * @swagger
 * /api/organizations/{orgId}/invites:
 *   post:
 *     summary: Invite a user to the organization
 *     tags: [Organizations]
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
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: member@example.com
 *               roleName:
 *                 type: string
 *                 example: admin
 *               roleId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Invitation sent successfully
 *       400:
 *         description: User already in organization
 *       403:
 *         description: Forbidden, insufficient permissions
 *       404:
 *         description: Organization not found
 */
router.post(
  "/:orgId/invites",
  requireAuth,
  requirePermission("users.invite"),
  validateRequest(inviteUserSchema),
  inviteUser
);

/**
 * @swagger
 * /api/organizations/{orgId}/members/{memberId}/role:
 *   put:
 *     summary: Update a member's role
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization ID
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *         description: Member's User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roleId
 *             properties:
 *               roleId:
 *                 type: string
 *                 example: role-id-123
 *     responses:
 *       200:
 *         description: Member role updated successfully
 *       400:
 *         description: Cannot change owner's role
 *       403:
 *         description: Forbidden, insufficient permissions
 *       404:
 *         description: Organization, Member, or Role not found
 */
router.put(
  "/:orgId/members/:memberId/role",
  requireAuth,
  requirePermission("users.role.update"),
  updateMemberRole
);

/**
 * @swagger
 * /api/organizations/{orgId}/api-keys:
 *   post:
 *     summary: Generate a new API Key for the organization
 *     tags: [API Keys]
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
 *                 example: Production API Key
 *     responses:
 *       201:
 *         description: API Key generated successfully. The key is only returned once.
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden, insufficient permissions
 */
router.post(
  "/:orgId/api-keys",
  requireAuth,
  requirePermission("apikeys.create"),
  validateRequest(generateApiKeySchema),
  generateApiKey
);

/**
 * @swagger
 * /api/organizations/{orgId}/api-keys:
 *   get:
 *     summary: List all API Keys for the organization
 *     tags: [API Keys]
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
 *         description: List of API Keys (without the actual secret key)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden, insufficient permissions
 */
router.get(
  "/:orgId/api-keys",
  requireAuth,
  requirePermission("apikeys.read"),
  listApiKeys
);

/**
 * @swagger
 * /api/organizations/{orgId}/api-keys/{keyId}:
 *   delete:
 *     summary: Revoke an API Key
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization ID
 *       - in: path
 *         name: keyId
 *         required: true
 *         schema:
 *           type: string
 *         description: API Key ID
 *     responses:
 *       200:
 *         description: API Key revoked successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden, insufficient permissions
 */
router.delete(
  "/:orgId/api-keys/:keyId",
  requireAuth,
  requirePermission("apikeys.delete"),
  revokeApiKey
);

export default router;
