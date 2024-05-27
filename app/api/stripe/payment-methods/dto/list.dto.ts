import { z } from "zod";

export const ListPaymentMethodsRequestSchema = z.object({
  customerId: z.string(),
});
export type SetupPaymentRequest = z.infer<
  typeof ListPaymentMethodsRequestSchema
>;
