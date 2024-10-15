import { env } from "@/env.mjs";
import { supaServerClient } from "@/src/data/clients/server";
import { NextResponse, type NextRequest } from "next/server";
import { google } from "googleapis";

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");

  if (!code || !state) {
    return Response.json({ error: "Missing code or state" }, { status: 400 });
  }

  try {
    const decodedState = JSON.parse(atob(state as string));
    const { sourceId } = decodedState;

    const oauth2Client = new google.auth.OAuth2(
      env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      `${requestUrl.origin}/api/auth/google-drive/callback`,
    );

    const tokenResponse = await oauth2Client.getToken(code);
    const tokenData = tokenResponse.tokens;
    if (tokenResponse.res?.status && tokenResponse.res?.status >= 400) {
      throw new Error(
        `Failed to exchange code for tokens: ${tokenResponse.res?.status} ${JSON.stringify(
          tokenResponse.res?.data,
        )}`,
      );
    }

    const { access_token, refresh_token, expiry_date } = tokenData;
    const supabase = supaServerClient();
    const { error } = await supabase
      .from("sources")
      .update({
        settings: {
          access_token,
          refresh_token,
          expires_at: expiry_date ? new Date(expiry_date).toISOString() : null,
        },
      })
      .eq("id", sourceId);

    if (error) {
      throw new Error(`Failed to update source settings: ${error.message}`);
    }

    return NextResponse.redirect(`${requestUrl.origin}/app/sources?success=true`);
  } catch (error) {
    console.error("Error in Google Drive OAuth callback:", error);
    return NextResponse.redirect(`${requestUrl.origin}/app/sources?error=true`);
  }
}
