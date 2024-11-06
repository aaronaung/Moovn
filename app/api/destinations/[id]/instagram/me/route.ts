import { InstagramAPIClient } from "@/src/libs/instagram/ig-client";

import { NextRequest } from "next/server";
import { verifyDestinationAccess } from "../../../util";
import { supaServerClient } from "@/src/data/clients/server";
import { igTokenUpdater } from "@/src/data/destinations";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const verifyResult = await verifyDestinationAccess(params.id);
  if (verifyResult.status !== 200) {
    return Response.json({ message: verifyResult.error }, { status: verifyResult.status });
  }
  const destination = verifyResult.data!;

  const igClient = new InstagramAPIClient(
    {
      long_lived_access_token: destination.long_lived_token,
      last_refreshed_at: new Date(destination.token_last_refreshed_at ?? 0),
    },
    igTokenUpdater(destination.id, { client: supaServerClient() }),
  );

  const myIgAccount = await igClient.getMe();
  return Response.json(myIgAccount);
}
