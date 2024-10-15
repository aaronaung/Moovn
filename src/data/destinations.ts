import { Tables } from "@/types/db";
import { SupabaseOptions } from "./clients/types";
import { throwOrData } from "./util";
import { getAuthUser } from "./users";
import { InstagramAPIToken } from "../libs/instagram/types";

export const saveDestination = async (
  destination: Partial<Tables<"destinations">>,
  { client }: SupabaseOptions,
) => {
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

export const getAllDestinations = async ({ client }: SupabaseOptions) => {
  const user = await getAuthUser({ client });

  if (!user) {
    return [];
  }
  return throwOrData(
    client
      .from("destinations")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
  );
};

export const getDestinationById = async (id: string, { client }: SupabaseOptions) => {
  return throwOrData(client.from("destinations").select("*").eq("id", id).maybeSingle());
};

export const igTokenUpdater = (destinationId: string, { client }: SupabaseOptions) => {
  return async (token: InstagramAPIToken) => {
    await client
      .from("destinations")
      .update({
        long_lived_token: token.accessToken,
        token_last_refreshed_at: token.lastRefreshedAt.toISOString(),
      })
      .eq("id", destinationId);
  };
};
