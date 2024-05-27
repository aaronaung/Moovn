import { Database } from "@/types/db";
import { SupabaseClient } from "@supabase/supabase-js";

export type SupabaseOptions = {
  client: SupabaseClient<Database, "public">;
};
