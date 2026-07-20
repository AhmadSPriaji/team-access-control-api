import { z } from "zod";

export const inviteUserSchema = z
  .object({
    email: z.string().trim().email("Invalid email address"),
    roleId: z.string().uuid("Invalid Role ID format (must be UUID)").optional(),
    roleName: z.string().trim().min(1, "Role name cannot be empty").optional(),
  })
  .refine((data) => data.roleId || data.roleName || true, {
    message: "Either roleId or roleName must be provided",
  });

export const acceptInvitationSchema = z.object({
  token: z.string().min(1, "Invitation token is required"),
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
