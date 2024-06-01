import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const accessToken = requestUrl.searchParams.get("access_token");
  const longLivedToken = requestUrl.searchParams.get("long_lived_token");
  const expiresIn = requestUrl.searchParams.get("expires_in");
  const returnPath = requestUrl.searchParams.get("data_access_expiration_time");

  console.log({
    accessToken,
    longLivedToken,
    expiresIn,
    returnPath,
  });

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(
    requestUrl.origin.concat(returnPath || "/app/sources"),
  );
}
