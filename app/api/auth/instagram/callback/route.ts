import { env } from "@/env.mjs";
import { supaServerClient } from "@/src/data/clients/server";
import { InstagramAPIClient } from "@/src/libs/instagram/ig-client";
import { isLocal } from "@/src/utils";
import { Tables } from "@/types/db";

import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const accessToken = requestUrl.searchParams.get("access_token");
  const destinationId = requestUrl.searchParams.get("state");

  if (!destinationId) {
    console.error("[InstagramAuthCallback] Destination ID is required");
    return Response.json({ message: "Destination ID is required" }, { status: 400 });
  }

  if (accessToken) {
    await supaServerClient()
      .from("destinations")
      .update({
        long_lived_token: accessToken,
      })
      .eq("id", destinationId);
  }

  const error = requestUrl.searchParams.get("error");
  if (error) {
    console.error("[InstagramAuthCallback] Auth error:", error);
  }

  const code = requestUrl.searchParams.get("code");
  if (code) {
    const result = await InstagramAPIClient.exchangeCodeForAccessToken(
      env.NEXT_PUBLIC_INSTAGRAM_CLIENT_ID,
      env.INSTAGRAM_CLIENT_SECRET,
      code,
      `${
        isLocal() ? "https://redirectmeto.com/http://localhost:3000" : requestUrl.origin
      }/api/auth/instagram/callback`,
    );

    const igAccount = await new InstagramAPIClient({
      accessToken: result.access_token,
      lastRefreshedAt: new Date(),
    }).getMe();

    let updatePayload: Partial<Tables<"destinations">> = {
      long_lived_token: result.access_token,
    };
    if (igAccount) {
      updatePayload = {
        ...updatePayload,
        linked_ig_user_id: igAccount.id,
      };
    }
    await supaServerClient().from("destinations").update(updatePayload).eq("id", destinationId);
  }

  return NextResponse.redirect(requestUrl.origin.concat("/app/destinations"));
}
