import { z } from "zod";

export const CreateCustomerProfileRequestSchema = z.object({
  name: z.string(),
  email: z.string(),
});
export type CreateCustomerProfileRequest = z.infer<
  typeof CreateCustomerProfileRequestSchema
>;
