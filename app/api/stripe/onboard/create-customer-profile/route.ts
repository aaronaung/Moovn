import { NextRequest } from "next/server";
import { CreateCustomerProfileRequestSchema } from "../dto/create-customer-profile.dto";
import { stripeClient } from "../..";

export async function POST(req: NextRequest) {
  const { email, name } = CreateCustomerProfileRequestSchema.parse(
    await req.json(),
  );
  const customerCreateResp = await stripeClient.customers.create({
    name,
    email,
  });
  return Response.json(customerCreateResp);
}
