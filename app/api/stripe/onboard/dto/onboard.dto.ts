import { z } from "zod";

export const OnboardRequestSchema = z.object({
  businessId: z.string(),
  onSuccessReturnUrl: z.string(),
});
export type OnboardRequest = z.infer<typeof OnboardRequestSchema>;
