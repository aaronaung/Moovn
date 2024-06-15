import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const accessToken = requestUrl.searchParams.get("access_token");
  const longLivedToken = requestUrl.searchParams.get("long_lived_token");
  const expiresIn = requestUrl.searchParams.get("expires_in");
  const dataAccessExpTime = requestUrl.searchParams.get(
    "data_access_expiration_time",
  );

  const requestUrlString = request.nextUrl.toString();
  console.log({
    accessToken,
    longLivedToken,
    expiresIn,
    dataAccessExpTime,
    requestUrlString,
  });
}
