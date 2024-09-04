import { InstagramAPIClient } from "@/src/libs/instagram/ig-client";

import { NextRequest } from "next/server";
import { verifyDestinationAccess } from "../../../util";
import { supaServerClient } from "@/src/data/clients/server";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const verifyResult = await verifyDestinationAccess(params.id);
  if (verifyResult.status !== 200) {
    return Response.json({ message: verifyResult.error }, { status: verifyResult.status });
  }
  const destination = verifyResult.data!;

  const igClient = new InstagramAPIClient(
    {
      accessToken: destination.long_lived_token,
      lastRefreshedAt: new Date(destination.token_last_refreshed_at ?? 0),
    },
    async (token) => {
      await supaServerClient()
        .from("destinations")
        .update({
          long_lived_token: token.accessToken,
          token_last_refreshed_at: token.lastRefreshedAt.toISOString(),
        })
        .eq("id", destination.id);
    },
  );

  const myIgAccount = await igClient.getMe();
  return Response.json(myIgAccount);
}
