import { z } from "zod";

export const DeletePaymentMethodRequestSchema = z.object({
  paymentMethodId: z.string(),
});
export type SetupPaymentRequest = z.infer<
  typeof DeletePaymentMethodRequestSchema
>;
