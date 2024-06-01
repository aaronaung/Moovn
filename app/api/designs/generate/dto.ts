import { z } from "zod";

export const GenerateDesignRequestSchema = z.object({
  templateId: z.string(),
});
export type GenerateDesignRequest = z.infer<typeof GenerateDesignRequestSchema>;
