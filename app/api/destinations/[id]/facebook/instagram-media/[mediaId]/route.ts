import { NextRequest } from "next/server";
import { verifyDestinationAccess } from "../../../../util";
import { FacebookGraphAPIClient } from "@/src/libs/facebook/facebook-client";

export async function GET(req: NextRequest, { params }: { params: { id: string; mediaId: string } }) {
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

  try {
    const media = await fbClient.getInstagramMedia(params.mediaId);
    return Response.json(media);
  } catch (err) {
    console.error(err);
    return Response.json({ message: "Failed to fetch media" }, { status: 500 });
  }
}
