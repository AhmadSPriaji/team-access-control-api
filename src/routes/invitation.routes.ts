import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { acceptInvitationSchema } from "../schemas/invitation.schema.js";
import { getInvitationDetails, acceptInvitation } from "../controllers/invitation.controller.js";

const router = Router();

/**
 * @swagger
 * /api/invitations/details:
 *   get:
 *     summary: Preview invitation details (Public)
 *     tags: [Invitations]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: The invitation token
 *     responses:
 *       200:
 *         description: Invitation details retrieved successfully
 *       400:
 *         description: Invalid or expired token
 *       404:
 *         description: Invitation not found
 */
router.get("/details", getInvitationDetails);

/**
 * @swagger
 * /api/invitations/accept:
 *   post:
 *     summary: Accept an organization invitation
 *     tags: [Invitations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: The invitation token
 *     responses:
 *       200:
 *         description: Invitation accepted successfully
 *       400:
 *         description: Invalid or expired token, or token missing
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Invitation not found
 */
router.post(
  "/accept",
  requireAuth,
  validateRequest(acceptInvitationSchema),
  acceptInvitation
);

export default router;
