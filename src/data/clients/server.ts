// NOTE: only server components should import anything from this file.
import { Database } from "@/types/db";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/env.mjs";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";

export const supaServerClient = () => {
  noStore();
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321",
    env.SUPABASE_SERVICE_ROLE_KEY,
  );
};

export async function supaServerComponentClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
}
