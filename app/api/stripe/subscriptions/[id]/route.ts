import { NextRequest } from "next/server";
import { stripeClient } from "../..";

export async function GET(_: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const resp = await stripeClient.subscriptions.retrieve(params.id, {
    expand: ["schedule", "items.data.price.product"],
  });

  return Response.json(resp);
}
