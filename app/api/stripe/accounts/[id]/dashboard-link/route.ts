import { NextRequest } from "next/server";
import { stripeClient } from "../../..";

export async function GET(_: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return Response.json(await stripeClient.accounts.createLoginLink(params.id));
}
