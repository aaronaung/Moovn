import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  // const { businessId, customerId, paymentMethodId, subscriptionPlan } =
  //   CreateSubscriptionRequestSchema.parse(await req.json());

  // const metadata: StripeSubscriptionMetadata = {
  //   business_id: businessId,
  //   subscription_plan: subscriptionPlan,
  // };

  // //https://docs.stripe.com/payments/save-and-reuse

  // const createResult = await stripeClient.subscriptions.create({
  //   customer: customerId,
  //   items: [
  //     {
  //       price:
  //         SubscriptionPriceId[
  //           subscriptionPlan as keyof typeof SubscriptionPriceId
  //         ],
  //     },
  //   ],
  //   billing_cycle_anchor_config: {
  //     day_of_month: getDate(Date.now()),
  //   },
  //   proration_behavior: "none",
  //   metadata,
  //   default_payment_method: paymentMethodId,
  // });

  // await supaServerClient()
  //   .from("businesses")
  //   .update({
  //     stripe_subscription_id: createResult.id,
  //   })
  //   .eq("id", businessId);
  // return Response.json(createResult);
  return Response.json({ message: "Hello" });
}
