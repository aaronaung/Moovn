import { Tables } from "@/types/db";
import { SupabaseOptions } from "./clients/types";
import { throwOrData } from "./util";
import { getAuthUser } from "./users";

export const saveSource = async (
  source: Partial<Tables<"sources">>,
  { client }: SupabaseOptions,
) => {
  return throwOrData(
    client
      .from("sources")
      .upsert(source as Tables<"sources">)
      .single(),
  );
};

export const deleteSource = async (id: string, { client }: SupabaseOptions) => {
  return throwOrData(client.from("sources").delete().eq("id", id).single());
};

export const getSourcesForAuthUser = async ({ client }: SupabaseOptions) => {
  const user = await getAuthUser({ client });

  if (!user) {
    return [];
  }
  return throwOrData(
    client
      .from("sources")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
  );
};
