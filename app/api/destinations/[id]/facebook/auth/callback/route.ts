import { supaServerClient } from "@/src/data/clients/server";
import { FacebookGraphAPIClient } from "@/src/libs/facebook/facebook-client";
import { Tables } from "@/types/db";

import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const requestUrl = new URL(request.url);
  const accessToken = requestUrl.searchParams.get("access_token");

  if (accessToken) {
    await supaServerClient()
      .from("destinations")
      .update({
        long_lived_token: accessToken,
      })
      .eq("id", params.id);
  }

  const error = requestUrl.searchParams.get("error");
  if (error) {
    console.error("Facebook auth error:", error);
  }

  const code = requestUrl.searchParams.get("code");
  if (code) {
    const result = await FacebookGraphAPIClient.exchangeCodeForAccessToken(
      code,
      `http://localhost:3000/api/destinations/${params.id}/facebook/auth/callback`,
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
    await supaServerClient().from("destinations").update(updatePayload).eq("id", params.id);
  }

  return NextResponse.redirect(requestUrl.origin.concat("/app/destinations"));
}
