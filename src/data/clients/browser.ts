// NOTE: only client components should import anything from this file.
import { env } from "@/env.mjs";
import { Database } from "@/types/db";
import { createBrowserClient } from "@supabase/ssr";

export const supaClientComponentClient = (() =>
  createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  ))();
