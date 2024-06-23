import { InstagramBusinessAccount } from "../libs/facebook/types";
import { SupabaseOptions } from "./clients/types";
import { throwOrData } from "./util";

export const getInstagramAccounts = async (destinationId: string): Promise<InstagramBusinessAccount[]> => {
  return (await fetch(`/api/destinations/${destinationId}/facebook/instagram-accounts`)).json();
};

export const linkInstagramAccount = async (
  { destinationId, accountId }: { destinationId: string; accountId: string },
  { client }: SupabaseOptions,
) => {
  return throwOrData(
    client.from("destinations").update({ linked_ig_user_id: accountId }).eq("id", destinationId).single(),
  );
};
