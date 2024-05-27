import { NextRequest } from "next/server";
import { stripeClient } from "../..";

export async function DELETE(
  _: NextRequest,
  { params }: { params: { id: string } },
) {
  const resp = await stripeClient.products.del(params.id);

  return Response.json(resp);
}
