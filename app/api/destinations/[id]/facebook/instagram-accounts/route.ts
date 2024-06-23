import { FacebookGraphAPIClient } from "@/src/libs/facebook/facebook-client";

import { NextRequest } from "next/server";
import { verifyDestinationAccess } from "../../../util";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const verifyResult = await verifyDestinationAccess(params.id);
  if (verifyResult.status !== 200) {
    return {
      status: verifyResult.status,
      body: { message: verifyResult.error },
    };
  }
  const destination = verifyResult.data!;

  const fbClient = new FacebookGraphAPIClient({
    accessToken: destination.long_lived_token,
    lastRefreshedAt: new Date(destination.token_last_refreshed_at),
  });

  const accounts = await fbClient.getInstagramAccounts();
  return Response.json(accounts);
}
