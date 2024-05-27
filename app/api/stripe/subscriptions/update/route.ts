import { NextRequest } from "next/server";
import { stripeClient } from "../..";
import { StripeSubscriptionMetadata } from "..";
import { SubscriptionPriceId } from "@/src/consts/stripe";
import { UpdateSubscriptionRequestSchema } from "../dto/update.dto";
import Stripe from "stripe";
import { SubscriptionPlan } from "@/src/consts/stripe";
import { supaServerClient } from "@/src/data/clients/server";

export async function POST(req: NextRequest) {
  const { toSubscriptionPlan, fromSubscriptionPlan, subscriptionId } =
    UpdateSubscriptionRequestSchema.parse(await req.json());

  if (toSubscriptionPlan === fromSubscriptionPlan) {
    return new Response(
      "Can't upgrade/downgrade to the same subscription plan.",
      { status: 400 },
    );
  }

  const subscription =
    await stripeClient.subscriptions.retrieve(subscriptionId);

  if (
    fromSubscriptionPlan === SubscriptionPlan.Starter &&
    toSubscriptionPlan === SubscriptionPlan.Pro
  ) {
    return Response.json(await upgradeSubscription(subscription));
  } else if (
    fromSubscriptionPlan === SubscriptionPlan.Pro &&
    toSubscriptionPlan === SubscriptionPlan.Starter
  ) {
    return Response.json(await downgradeSubscription(subscription));
  } else {
    return new Response(
      `Subscription update from ${fromSubscriptionPlan} to ${toSubscriptionPlan} not supported.`,
      { status: 400 },
    );
  }
}

const upgradeSubscription = async (
  subscription: Stripe.Subscription,
): Promise<Stripe.Subscription> => {
  const subscriptionItem = subscription.items.data[0]; // We know there's always only one item.
  if (subscription.schedule) {
    await stripeClient.subscriptionSchedules.release(
      subscription.schedule as string,
    );
  }
  if (subscription.cancel_at) {
    await stripeClient.subscriptions.update(subscription.id, {
      cancel_at_period_end: false,
    });
  }
  const updateResult = await stripeClient.subscriptions.update(
    subscription.id,
    {
      proration_behavior: "none",
      items: [
        {
          id: subscriptionItem.id,
          deleted: true,
        },
        {
          price: SubscriptionPriceId[SubscriptionPlan.Pro],
        },
      ],
    },
  );

  const subscriptionMetadata =
    subscription.metadata as unknown as StripeSubscriptionMetadata;

  await supaServerClient()
    .from("businesses")
    .update({
      current_plan: SubscriptionPlan.Pro,
    })
    .eq("id", subscriptionMetadata.business_id);
  return updateResult;
};

const downgradeSubscription = async (
  subscription: Stripe.Subscription,
): Promise<Stripe.Subscription> => {
  // If it's a downgrade, we want to cancel it at the period end, then start a new subscription at the beginning
  // of the next billing period.
  let subscriptionScheduleId = subscription.schedule;
  if (!subscriptionScheduleId) {
    const subscriptionSchedule =
      await stripeClient.subscriptionSchedules.create({
        from_subscription: subscription.id,
      });
    subscriptionScheduleId = subscriptionSchedule.id;
  }

  await stripeClient.subscriptionSchedules.update(
    subscriptionScheduleId as string,
    {
      end_behavior: "release",
      phases: [
        {
          start_date: subscription.current_period_start,
          end_date: subscription.current_period_end,
          proration_behavior: "none",
          items: [
            {
              price: SubscriptionPriceId[SubscriptionPlan.Pro],
            },
          ],
        },
        {
          start_date: subscription.current_period_end,
          proration_behavior: "none",
          items: [
            {
              price: SubscriptionPriceId[SubscriptionPlan.Starter],
            },
          ],
        },
      ],
    },
  );

  const subscriptionMetadata =
    subscription.metadata as unknown as StripeSubscriptionMetadata;

  await supaServerClient()
    .from("businesses")
    .update({
      current_plan: SubscriptionPlan.Starter,
    })
    .eq("id", subscriptionMetadata.business_id);

  return subscription;
};
