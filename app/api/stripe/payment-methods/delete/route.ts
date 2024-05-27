import { NextRequest } from "next/server";
import { DeletePaymentMethodRequestSchema } from "../dto/delete.dto";
import { stripeClient } from "../..";

export async function POST(req: NextRequest) {
  const { paymentMethodId } = DeletePaymentMethodRequestSchema.parse(
    await req.json(),
  );

  const result = await stripeClient.paymentMethods.detach(paymentMethodId);
  return Response.json(result);
}
