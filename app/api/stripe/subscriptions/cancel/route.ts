import { NextRequest } from "next/server";
import { stripeClient } from "../..";
import { CancelSubscriptionRequestSchema } from "../dto/cancel.dto";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const { businessId, subscriptionId } = CancelSubscriptionRequestSchema.parse(
    await req.json(),
  );

  const subscription =
    await stripeClient.subscriptions.retrieve(subscriptionId);

  let sub: Stripe.Subscription;
  if (subscription.schedule) {
    const schedule = await stripeClient.subscriptionSchedules.update(
      subscription.schedule as string,
      {
        end_behavior: "cancel",
        phases: [
          {
            proration_behavior: "none",
            start_date: subscription.current_period_start,
            end_date: subscription.current_period_end,
            items: [
              {
                price: subscription.items.data[0].price.id,
              },
            ],
          },
        ],
        expand: ["subscription"],
      },
    );
    sub = schedule.subscription as Stripe.Subscription;
  } else {
    sub = await stripeClient.subscriptions.update(subscription.id, {
      cancel_at_period_end: true,
    });
  }
  return Response.json(sub);
}
