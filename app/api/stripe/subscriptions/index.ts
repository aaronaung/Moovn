import { SubscriptionPlan } from "@/src/consts/stripe";

export type StripeSubscriptionMetadata = {
  business_id: string;
  subscription_plan: SubscriptionPlan;
};
