import { InstagramBusinessAccount, InstagramMedia } from "../libs/instagram/types";
import { SupabaseOptions } from "./clients/types";
import { throwOrData } from "./util";

export const getInstagramAccount = async (
  destinationId: string,
): Promise<InstagramBusinessAccount> => {
  return (await fetch(`/api/destinations/${destinationId}/instagram/me`)).json();
};

export const linkInstagramAccount = async (
  { destinationId, accountId }: { destinationId: string; accountId: string },
  { client }: SupabaseOptions,
) => {
  return throwOrData(
    client
      .from("destinations")
      .update({ linked_ig_user_id: accountId })
      .eq("id", destinationId)
      .single(),
  );
};

export const getInstagramMedia = async ({
  destinationId,
  mediaId,
}: {
  destinationId: string;
  mediaId: string;
}): Promise<InstagramMedia> => {
  return (await fetch(`/api/destinations/${destinationId}/instagram/ig-media/${mediaId}`)).json();
};
