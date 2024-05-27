import { NextRequest } from "next/server";
import { SetupPaymentRequestSchema } from "../dto/setup.dto";
import { stripeClient } from "../..";

export async function POST(req: NextRequest) {
  const { businessId, customerId } = SetupPaymentRequestSchema.parse(
    await req.json(),
  );

  const session = await stripeClient.checkout.sessions.create({
    mode: "setup",
    customer: customerId,
    currency: "usd",
    payment_method_types: ["card"],
    setup_intent_data: {
      metadata: {
        business_id: businessId,
        customer_id: customerId,
      },
    },
    success_url: `${req.nextUrl.origin}/app/instructor/billing`,
    cancel_url: `${req.nextUrl.origin}/app/instructor/billing`,
  });
  return Response.json(session);
}
