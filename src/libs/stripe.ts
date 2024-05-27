import Stripe from "stripe";
import {
  SubscriptionPlan,
  SubscriptionPlanUpdateType,
  SubscriptionPlanTier,
} from "../consts/stripe";

export const getPlanUpdateType = (
  from: SubscriptionPlan,
  to: SubscriptionPlan,
): SubscriptionPlanUpdateType => {
  if (from === to) {
    return SubscriptionPlanUpdateType.Noop;
  }
  if (from === SubscriptionPlan.Hobby) {
    return SubscriptionPlanUpdateType.New;
  }
  if (to === SubscriptionPlan.Hobby) {
    return SubscriptionPlanUpdateType.Cancel;
  }
  return SubscriptionPlanTier[to] > SubscriptionPlanTier[from]
    ? SubscriptionPlanUpdateType.Upgrade
    : SubscriptionPlanUpdateType.Downgrade;
};

export const derivePlanFromSubscription = (
  sub?: Stripe.Subscription | null,
): SubscriptionPlan => {
  return sub?.status === "canceled"
    ? SubscriptionPlan.Hobby
    : ((sub?.items.data[0].price.product as Stripe.Product | undefined)
        ?.name as SubscriptionPlan) ?? SubscriptionPlan.Hobby;
};
