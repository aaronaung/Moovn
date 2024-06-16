import { supaServerClient } from "@/src/data/clients/server";
import { FacebookGraphAPIClient } from "@/src/libs/destinations/fb";
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
    const result = await FacebookGraphAPIClient.exchangeCodeForAccessToken(
      code,
      `http://localhost:3000/api/destinations/${params.id}/facebook/auth/callback`,
    );

    await supaServerClient()
      .from("destinations")
      .update({
        long_lived_token: result.access_token,
      })
      .eq("id", params.id);

    const getFbDataUrl = new URL(
      "https://graph.facebook.com/v20.0/me/accounts",
    );
    getFbDataUrl.searchParams.set("access_token", result.access_token);
    getFbDataUrl.searchParams.set(
      "fields",
      "id,name,instagram_business_account",
    );
    const fbData = await (await fetch(getFbDataUrl.toString())).json();
    console.log(fbData);
  }

  return NextResponse.redirect(requestUrl.origin.concat("/app/destinations"));
}
