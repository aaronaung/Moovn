import { z } from "zod";

export const SetupPaymentRequestSchema = z.object({
  businessId: z.string(),
  customerId: z.string(),
});
export type SetupPaymentRequest = z.infer<typeof SetupPaymentRequestSchema>;
