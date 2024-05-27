import { NextRequest } from "next/server";
import { stripeClient } from "../../..";

export async function GET(
  _: NextRequest,
  { params }: { params: { id: string } },
) {
  return Response.json(await stripeClient.accounts.createLoginLink(params.id));
}
