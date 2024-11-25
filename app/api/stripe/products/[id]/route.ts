import { NextRequest } from "next/server";
import { stripeClient } from "../..";

export async function DELETE(_: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const resp = await stripeClient.products.del(params.id);

  return Response.json(resp);
}
