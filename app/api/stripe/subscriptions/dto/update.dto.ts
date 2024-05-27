import { SubscriptionPlan } from "@/src/consts/stripe";
import { z } from "zod";

export const UpdateSubscriptionRequestSchema = z.object({
  subscriptionId: z.string(),
  fromSubscriptionPlan: z.enum([
    SubscriptionPlan.Hobby,
    SubscriptionPlan.Starter,
    SubscriptionPlan.Pro,
  ]),
  toSubscriptionPlan: z.enum([
    SubscriptionPlan.Hobby,
    SubscriptionPlan.Starter,
    SubscriptionPlan.Pro,
  ]),
});
export type UpdateSubscriptionRequest = z.infer<
  typeof UpdateSubscriptionRequestSchema
>;
