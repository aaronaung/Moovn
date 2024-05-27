import { CheckOutRequest } from "@/app/api/stripe/check-out/dto/check-out.dto";
import { UpsertStripeProductRequest } from "@/app/api/stripe/products/dto/upsert-product.dto";
import Stripe from "stripe";
import { throwOrData } from "./util";
import { SupabaseOptions } from "./clients/types";
import { CreateSubscriptionRequest } from "@/app/api/stripe/subscriptions/dto/create.dto";
import { CancelSubscriptionRequest } from "@/app/api/stripe/subscriptions/dto/cancel.dto";
import { UpdateSubscriptionRequest } from "@/app/api/stripe/subscriptions/dto/update.dto";
import { SetupPaymentRequest } from "@/app/api/stripe/payment-methods/dto/setup.dto";
import { CreateCustomerProfileRequest } from "@/app/api/stripe/onboard/dto/create-customer-profile.dto";

export const getUserStripeProduct = async (
  {
    userId,
    stripeProductId,
  }: {
    userId: string;
    stripeProductId?: string | null;
  },
  { client }: SupabaseOptions,
) => {
  if (!stripeProductId) {
    return null;
  }

  return throwOrData(
    client
      .from("user_stripe_products")
      .select("*")
      .eq("stripe_product_id", stripeProductId)
      .eq("user_id", userId)
      .maybeSingle(),
  );
};

export const createStripeCustomerProfile = async (
  req: CreateCustomerProfileRequest,
): Promise<Stripe.Customer> => {
  const resp = await fetch("/api/stripe/onboard/create-customer-profile", {
    method: "POST",
    body: JSON.stringify(req),
  });

  return resp.json();
};

export const createStripeCheckoutSession = async (
  req: CheckOutRequest,
): Promise<Stripe.Checkout.Session> => {
  const resp = await fetch("/api/stripe/check-out", {
    method: "POST",
    body: JSON.stringify(req),
  });

  return resp.json();
};

export const upsertStripeProduct = async (
  req: UpsertStripeProductRequest,
): Promise<Stripe.Product> => {
  const resp = await fetch("/api/stripe/products/upsert", {
    method: "POST",
    body: JSON.stringify(req),
  });

  return resp.json();
};

export const deleteStripeProduct = async (
  stripeProductId: string,
): Promise<void> => {
  const resp = await fetch(`/api/stripe/products/${stripeProductId}`, {
    method: "DELETE",
  });

  return resp.json();
};
export const getStripeAccount = async (
  stripeAccountId: string,
): Promise<Stripe.Account> => {
  const resp = await fetch(`/api/stripe/accounts/${stripeAccountId}`);
  return resp.json();
};

export const createStripeSubscription = async (
  req: CreateSubscriptionRequest,
): Promise<Stripe.Subscription> => {
  const resp = await fetch("/api/stripe/subscriptions/create", {
    method: "POST",
    body: JSON.stringify(req),
  });

  return resp.json();
};

export const cancelStripeSubscription = async (
  req: CancelSubscriptionRequest,
): Promise<Stripe.Subscription> => {
  const resp = await fetch(`/api/stripe/subscriptions/cancel`, {
    method: "POST",
    body: JSON.stringify(req),
  });

  return resp.json();
};

export const updateStripeSubscription = async (
  req: UpdateSubscriptionRequest,
): Promise<Stripe.Subscription> => {
  const resp = await fetch(`/api/stripe/subscriptions/update`, {
    method: "POST",
    body: JSON.stringify(req),
  });

  return resp.json();
};

export const getStripeSubscriptionForBusiness = async (
  businessId: string,
  { client }: SupabaseOptions,
): Promise<Stripe.Subscription | null> => {
  const { stripe_subscription_id } = await throwOrData(
    client.from("businesses").select("*").eq("id", businessId).single(),
  );
  if (!stripe_subscription_id) {
    return null;
  }
  const resp = await fetch(
    `/api/stripe/subscriptions/${stripe_subscription_id}`,
  );
  return resp.json();
};

export const getStripeSetupPaymentSession = async (
  req: SetupPaymentRequest,
): Promise<Stripe.Checkout.Session> => {
  const resp = await fetch(`/api/stripe/payment-methods/setup`, {
    method: "POST",
    body: JSON.stringify(req),
  });

  return resp.json();
};

export const getStripePaymentMethods = async (
  customerId?: string,
): Promise<Stripe.PaymentMethod[]> => {
  if (!customerId) {
    return [];
  }
  const resp = await fetch(`/api/stripe/payment-methods/list`, {
    method: "POST",
    body: JSON.stringify({ customerId }),
  });

  return resp.json();
};

export const deleteStripePaymentMethod = async (
  paymentMethodId: string,
): Promise<void> => {
  const resp = await fetch(`/api/stripe/payment-methods/delete`, {
    method: "POST",
    body: JSON.stringify({ paymentMethodId }),
  });

  return resp.json();
};

export const releaseStripeSubscriptionSchedule = async (
  subscriptionId: string,
): Promise<Stripe.Subscription> => {
  const resp = await fetch(
    `/api/stripe/subscriptions/${subscriptionId}/release-schedule`,
    {
      method: "POST",
    },
  );

  return resp.json();
};

export const getStripeDashboardLink = async (
  accountId: string,
): Promise<Stripe.LoginLink> => {
  const resp = await fetch(`/api/stripe/accounts/${accountId}/dashboard-link`);
  return resp.json();
};
