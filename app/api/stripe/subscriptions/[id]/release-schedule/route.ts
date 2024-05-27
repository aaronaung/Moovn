import { NextRequest } from "next/server";
import { stripeClient } from "../../..";
import Stripe from "stripe";

export async function POST(
  _: NextRequest,
  { params }: { params: { id: string } },
) {
  const subscription = await stripeClient.subscriptions.retrieve(params.id, {
    expand: ["schedule"],
  });

  let resultSubscription: Stripe.Subscription = subscription;

  const schedule = subscription.schedule as Stripe.SubscriptionSchedule;
  if (schedule) {
    const result = await stripeClient.subscriptionSchedules.release(
      schedule.id as string,
      {
        expand: ["subscription"],
      },
    );
    resultSubscription = result.subscription as Stripe.Subscription;
  }
  if (subscription.cancel_at) {
    const result = await stripeClient.subscriptions.update(subscription.id, {
      cancel_at_period_end: false,
    });
    resultSubscription = result;
  }
  return Response.json(resultSubscription);
}
