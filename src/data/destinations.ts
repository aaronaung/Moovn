import { Tables } from "@/types/db";
import { SupabaseOptions } from "./clients/types";
import { throwOrData } from "./util";
import { getAuthUser } from "./users";

export const saveDestination = async (destination: Partial<Tables<"destinations">>, { client }: SupabaseOptions) => {
  return throwOrData(
    client
      .from("destinations")
      .upsert(destination as Tables<"destinations">)
      .single(),
  );
};

export const deleteDestination = async (id: string, { client }: SupabaseOptions) => {
  return throwOrData(client.from("destinations").delete().eq("id", id).single());
};

export const getDestinationsForAuthUser = async ({ client }: SupabaseOptions) => {
  const user = await getAuthUser({ client });

  if (!user) {
    return [];
  }
  return throwOrData(
    client.from("destinations").select("*").eq("owner_id", user.id).order("created_at", { ascending: false }),
  );
};

export const getDestinationById = async (id: string, { client }: SupabaseOptions) => {
  return throwOrData(client.from("destinations").select("*").eq("id", id).maybeSingle());
};
