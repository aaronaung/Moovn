import _ from "lodash";
import { SupabaseOptions } from "./clients/types";
import { throwOrData } from "./util";
import { User } from "@supabase/supabase-js";

export const getAuthUser = async ({ client }: SupabaseOptions) => {
  try {
    const {
      data: { user },
      error,
    } = await client.auth.getUser();
    if (error) throw error;

    return toDbUser(user, { client });
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
};

export const toDbUser = async (
  user: User | null | undefined,
  { client }: SupabaseOptions,
) => {
  if (!user) {
    return null;
  }
  const dbUser = await throwOrData(
    client.from("users").select("*").eq("id", user.id).limit(1).maybeSingle(),
  );
  if (
    dbUser !== null &&
    (dbUser.first_name === null ||
      dbUser.last_name === null ||
      dbUser.avatar_url === null) &&
    !_.isEmpty(user.user_metadata)
  ) {
    // Fill in missing data.
    const resp = await throwOrData(
      client
        .from("users")
        .update({
          id: user.id,
          ...(user.user_metadata.full_name
            ? {
                first_name: user.user_metadata.full_name.split(" ")[0],
                last_name: user.user_metadata.full_name.split(" ")[1],
              }
            : {}),
          ...(user.user_metadata.avatar_url
            ? { avatar_url: user.user_metadata.avatar_url }
            : {}),
        })
        .eq("id", user.id)
        .select("*")
        .limit(1)
        .order("created_at", { ascending: false })
        .maybeSingle(),
    );
    return resp;
  }
  return dbUser;
};
