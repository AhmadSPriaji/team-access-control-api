import { z } from "zod";

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(3, "Organization name must be at least 3 characters long"),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
