export enum SubscriptionPlan {
  Hobby = "Hobby",
  Starter = "Starter",
  Pro = "Pro",
}

export const SubscriptionPlanTier = {
  [SubscriptionPlan.Hobby]: 1,
  [SubscriptionPlan.Starter]: 2,
  [SubscriptionPlan.Pro]: 3,
};

export enum SubscriptionPlanUpdateType {
  Upgrade = "Upgrade",
  Downgrade = "Downgrade",
  New = "New",
  Cancel = "Cancel",
  Noop = "Noop",
}

export const SubscriptionRules = {
  [SubscriptionPlan.Hobby]: {
    pricing: 0,
    uploadLimit: 5,
    classSalesLimit: 10,
    reviewSalesLimit: 10,
    percentKeepAfterLimit: 0.25,
  },
  [SubscriptionPlan.Starter]: {
    pricing: 19.99,
    uploadLimit: 10,
    classSalesLimit: 50,
    reviewSalesLimit: 50,
    percentKeepAfterLimit: 0.5,
  },
  [SubscriptionPlan.Pro]: {
    pricing: 99.99,
    uploadLimit: 25,
    classSalesLimit: 200,
    reviewSalesLimit: 200,
    percentKeepAfterLimit: 0.65,
  },
};

export const SubscriptionPriceId = {
  [SubscriptionPlan.Starter]: "env.NEXT_PUBLIC_STRIPE_STARTER_PLAN_PRICE_ID",
  [SubscriptionPlan.Pro]: "env.NEXT_PUBLIC_STRIPE_PRO_PLAN_PRICE_ID",
};

export const SubscriptionPriceIdToPlan = {
  ["env.NEXT_PUBLIC_STRIPE_STARTER_PLAN_PRICE_ID"]: SubscriptionPlan.Starter,
  ["env.NEXT_PUBLIC_STRIPE_PRO_PLAN_PRICE_ID"]: SubscriptionPlan.Pro,
};
