import { supaServerClient } from "@/src/data/clients/server";
import { FacebookGraphAPIClient } from "@/src/libs/facebook/facebook-client";
import { Tables } from "@/types/db";

import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const accessToken = requestUrl.searchParams.get("access_token");
  const destinationId = requestUrl.searchParams.get("state");

  if (!destinationId) {
    console.error("[FacebookAuthCallback] Destination ID is required");
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
    console.error("[FacebookAuthCallback] Auth error:", error);
  }

  const code = requestUrl.searchParams.get("code");
  if (code) {
    const result = await FacebookGraphAPIClient.exchangeCodeForAccessToken(
      code,
      `${requestUrl.origin}/api/auth/facebook/callback`,
    );

    const igAccounts = await new FacebookGraphAPIClient({
      accessToken: result.access_token,
      lastRefreshedAt: new Date(),
    }).getInstagramAccounts();

    let updatePayload: Partial<Tables<"destinations">> = {
      long_lived_token: result.access_token,
    };
    if (igAccounts.length === 1) {
      updatePayload = {
        ...updatePayload,
        linked_ig_user_id: igAccounts[0].id,
      };
    }
    await supaServerClient().from("destinations").update(updatePayload).eq("id", destinationId);
  }

  return NextResponse.redirect(requestUrl.origin.concat("/app/destinations"));
}
