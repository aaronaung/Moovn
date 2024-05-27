import { z } from "zod";

export const CancelSubscriptionRequestSchema = z.object({
  businessId: z.string(),
  subscriptionId: z.string(),
});
export type CancelSubscriptionRequest = z.infer<
  typeof CancelSubscriptionRequestSchema
>;
