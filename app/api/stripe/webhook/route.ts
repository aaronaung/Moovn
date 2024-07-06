import { NextRequest } from "next/server";
import { stripeClient } from "..";
import Stripe from "stripe";

import { supaServerClient } from "@/src/data/clients/server";
import { throwOrData } from "@/src/data/util";
import { StripeCheckoutMetadata } from "../check-out";
import { ProductType } from "../products";

const handleProductPurchase = async (metadata: StripeCheckoutMetadata) => {
  let quantity = parseInt(metadata.quantity) || 0;
  if (metadata.product_type === ProductType.Review) {
    // Review products are not limited to one per user.
    const result = await throwOrData(
      supaServerClient()
        .from("user_stripe_products")
        .select("quantity")
        .eq("stripe_product_id", metadata.stripe_product_id)
        .eq("user_id", metadata.user_id)
        .eq("type", metadata.product_type)
        .maybeSingle(),
    );
    if (result) {
      quantity += result.quantity;
    }
  }

  await throwOrData(
    supaServerClient().from("user_stripe_products").upsert({
      stripe_product_id: metadata.stripe_product_id,
      user_id: metadata.user_id,
      type: metadata.product_type,
      quantity,
    }),
  );
};

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();
  let event: Stripe.Event;

  if (!sig) {
    return new Response("No stripe signature", { status: 400 });
  }

  try {
    event = stripeClient.webhooks.constructEvent(body, sig, "env.STRIPE_WEBHOOK_SECRET");
  } catch (err: any) {
    console.log(`⚠️  Webhook signature verification failed.`, err.message);
    return new Response("Webhook signature verification failed", {
      status: 400,
    });
  }

  switch (event.type) {
    case "checkout.session.completed":
      const checkoutSessionCompleteEvent = event.data.object;
      if (checkoutSessionCompleteEvent.mode === "payment") {
        // This handles free products.
        await handleProductPurchase(checkoutSessionCompleteEvent.metadata as unknown as StripeCheckoutMetadata);
      }

      console.log("checkout.session.completed", checkoutSessionCompleteEvent);

      break;
    case "payment_method.attached":
      break;
    case "payment_intent.succeeded":
      const paymentSuccessEvent = event.data.object;
      await handleProductPurchase(paymentSuccessEvent.metadata as unknown as StripeCheckoutMetadata);
      break;
    case "payment_intent.payment_failed":
      break;
    default:
    // console.log(`Unhandled event type ${event.type}`);
  }

  return new Response();
}
