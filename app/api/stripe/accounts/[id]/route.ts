import { NextRequest } from "next/server";
import { stripeClient } from "../..";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  return Response.json(await stripeClient.accounts.retrieve(params.id));
}
