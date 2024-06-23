import { supaServerClient } from "@/src/data/clients/server";
import { getDestinationById } from "@/src/data/destinations";
import { FacebookGraphAPIClient } from "@/src/libs/facebook/facebook-client";

import { NextRequest } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const destination = await getDestinationById(params.id, {
    client: supaServerClient(),
  });

  if (!destination) {
    return {
      status: 404,
      body: { message: "Destination not found" },
    };
  }
  if (!destination.long_lived_token) {
    return {
      status: 400,
      body: { message: "Destination does not have a long-lived token" },
    };
  }

  const fbClient = new FacebookGraphAPIClient({
    accessToken: destination.long_lived_token,
    lastRefreshedAt: new Date(destination.token_last_refreshed_at),
  });

  const accounts = await fbClient.getInstagramAccounts();
  return Response.json(accounts);
}
