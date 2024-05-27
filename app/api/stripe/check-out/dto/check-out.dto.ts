import { z } from "zod";

export const CheckOutRequestSchema = z.object({
  productId: z.string(),
  businessStripeAccountId: z.string(),
  userId: z.string(),
  returnUrl: z.string(),
  quantity: z.number(),
});
export type CheckOutRequest = z.infer<typeof CheckOutRequestSchema>;
