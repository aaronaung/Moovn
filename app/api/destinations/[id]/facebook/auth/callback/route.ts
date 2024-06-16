import { env } from "@/env.mjs";
import { supaServerClient } from "@/src/data/clients/server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
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
    const url = new URL("https://graph.facebook.com/v12.0/oauth/access_token");
    url.searchParams.set("client_id", env.NEXT_PUBLIC_FACEBOOK_APP_ID);
    url.searchParams.set("client_secret", env.FACEBOOK_APP_SECRET);
    url.searchParams.set("code", code);
    url.searchParams.set(
      "redirect_uri",
      `http://localhost:3000/api/destinations/${params.id}/facebook/auth/callback`,
    );

    const result = await (await fetch(url.toString())).json();
    try {
      await supaServerClient()
        .from("destinations")
        .update({
          long_lived_token: result.access_token,
        })
        .eq("id", params.id);
    } catch (err) {
      console.error(err);
    }
  }

  return NextResponse.redirect(requestUrl.origin.concat("/app/destinations"));
}
