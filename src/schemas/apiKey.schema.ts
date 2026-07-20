import { z } from "zod";

export const generateApiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});
