import { NextRequest, NextResponse } from "next/server";
import { match } from "path-to-regexp";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const excludedPaths = [
  "/api/stripe/webhook",
  "/api/auth/callback",
  "/api/auth/facebook/callback",
  "/api/auth/mindbody/callback",
];

export async function middleware(req: NextRequest) {
  try {
    for (const route of excludedPaths) {
      const urlMatch = match(route, { decode: decodeURIComponent });
      const pathname = req.nextUrl.pathname;

      if (urlMatch(pathname)) {
        return NextResponse.next();
      }
    }
    return await updateSession(req);
  } catch (err) {
    console.error("ERROR", err);
    return new Response("Can't update auth session", { status: 500 });
  }
}

export const config = {
  matcher: ["/app/:path*", "/api/:path*"],
};

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: "",
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    },
  );

  const { error } = await supabase.auth.getUser();
  if (error) {
    const requestUrl = new URL(request.url);
    const returnPath = requestUrl.searchParams.get("return_path");
    const resp = await supabase.auth.refreshSession();
    if (resp.data.session) {
      return NextResponse.next();
    }
    return NextResponse.redirect(
      requestUrl.origin.concat(`/sign-in?return_path=${returnPath || requestUrl.pathname}`),
    );
  }

  return response;
}
