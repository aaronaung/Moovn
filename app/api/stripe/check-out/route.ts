import { NextRequest } from "next/server";
import { stripeClient } from "..";
import { CheckOutRequestSchema } from "./dto/check-out.dto";
import Stripe from "stripe";
import { StripeCheckoutMetadata } from ".";
import { StripeProductMetadata } from "../products";

const APPLICATION_FEE_PERCENTAGE = 0.1;

export async function POST(req: NextRequest) {
  const { quantity, productId, businessStripeAccountId, userId, returnUrl } =
    CheckOutRequestSchema.parse(await req.json());

  const product = await stripeClient.products.retrieve(
    productId,
    {
      expand: ["default_price"],
    },
    {
      stripeAccount: businessStripeAccountId,
    },
  );

  const price: Stripe.Price = product.default_price as Stripe.Price;
  const checkoutMetadata: StripeCheckoutMetadata = {
    stripe_product_id: product.id,
    quantity: quantity.toString(),
    user_id: userId,
    product_type: (product.metadata as StripeProductMetadata).type,
  };

  const session = await stripeClient.checkout.sessions.create(
    {
      payment_intent_data: {
        // application_fee_amount: round(
        //   (price.unit_amount ?? 0) * APPLICATION_FEE_PERCENTAGE * quantity,
        // ),
        metadata: checkoutMetadata,
      },
      metadata: checkoutMetadata,
      line_items: [
        {
          price: price.id,
          quantity: quantity,
        },
      ],
      mode: "payment",
      success_url: returnUrl,
      cancel_url: returnUrl,
    },
    {
      stripeAccount: businessStripeAccountId,
    },
  );

  return Response.json(session);
}
