import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().trim().min(3, "Project name must be at least 3 characters long"),
  description: z.string().trim().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
