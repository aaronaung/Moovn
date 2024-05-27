import { NextRequest } from "next/server";
import { stripeClient } from "../..";
import { ListPaymentMethodsRequestSchema } from "../dto/list.dto";

export async function POST(req: NextRequest) {
  const { customerId } = ListPaymentMethodsRequestSchema.parse(
    await req.json(),
  );

  const paymentMethods = await stripeClient.paymentMethods.list({
    customer: customerId,
  });

  return Response.json(paymentMethods.data);
}
