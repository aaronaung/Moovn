import { SubscriptionPlan } from "@/src/consts/stripe";
import { z } from "zod";

export const CreateSubscriptionRequestSchema = z.object({
  businessId: z.string(),
  customerId: z.string(),
  paymentMethodId: z.string(),
  subscriptionPlan: z.enum([
    SubscriptionPlan.Starter,
    SubscriptionPlan.Pro,
    SubscriptionPlan.Hobby,
  ]),
});
export type CreateSubscriptionRequest = z.infer<
  typeof CreateSubscriptionRequestSchema
>;
