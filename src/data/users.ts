import _ from "lodash";
import { SupabaseOptions } from "./clients/types";
import { throwOrData } from "./util";
import { User } from "@supabase/supabase-js";
import { Tables } from "@/types/db";

export const getAuthUser = async ({ client }: SupabaseOptions): Promise<Tables<"users"> | null> => {
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

export const getUserByHandle = async (
  handle: string,
  { client }: SupabaseOptions,
): Promise<Tables<"users"> | null> => {
  try {
    const user = await throwOrData(
      client.from("users").select("*").eq("handle", handle).maybeSingle(),
    );
    return user as Tables<"users"> | null;
  } catch (error) {
    console.error("Error getting user by handle:", error);
    return null;
  }
};

export const toDbUser = async (
  user: User | null | undefined,
  { client }: SupabaseOptions,
): Promise<Tables<"users"> | null> => {
  if (!user) {
    return null;
  }

  const dbUser = (await throwOrData(
    client.from("users").select("*").eq("id", user.id).limit(1).maybeSingle(),
  )) as Tables<"users">;
  console.log("calling toDbUser", dbUser);
  if (
    dbUser !== null &&
    (dbUser.first_name === null ||
      dbUser.last_name === null ||
      dbUser.avatar_url === null ||
      dbUser.handle === null ||
      dbUser.type === null) &&
    !_.isEmpty(user.user_metadata)
  ) {
    // Fill in missing data from user metadata
    const updateData: any = {
      id: user.id,
      ...(user.user_metadata.full_name
        ? {
            first_name: user.user_metadata.full_name.split(" ")[0],
            last_name: user.user_metadata.full_name.split(" ")[1],
          }
        : {}),
      ...(user.user_metadata.first_name ? { first_name: user.user_metadata.first_name } : {}),
      ...(user.user_metadata.last_name ? { last_name: user.user_metadata.last_name } : {}),
      ...(user.user_metadata.avatar_url ? { avatar_url: user.user_metadata.avatar_url } : {}),
      ...(user.user_metadata.handle ? { handle: user.user_metadata.handle } : {}),
      ...(user.user_metadata.type ? { type: user.user_metadata.type } : {}),
    };

    const resp = await throwOrData(
      client
        .from("users")
        .update(updateData)
        .eq("id", user.id)
        .select("*")
        .limit(1)
        .order("created_at", { ascending: false })
        .maybeSingle(),
    );
    return resp as Tables<"users">;
  }
  return dbUser as Tables<"users">;
};

export const updateUserProfile = async (
  profileData: {
    email?: string;
    handle?: string | null;
    avatar_url?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  },
  { client }: SupabaseOptions,
): Promise<Tables<"users">> => {
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();

  if (authError || !user) {
    throw new Error("User not authenticated");
  }

  // Check if handle is unique (if provided)
  if (profileData.handle) {
    const { data: existingUser } = await client
      .from("users")
      .select("id")
      .eq("handle", profileData.handle)
      .neq("id", user.id)
      .maybeSingle();

    if (existingUser) {
      throw new Error("This handle is already taken. Please choose a different one.");
    }
  }

  return throwOrData(
    client.from("users").update(profileData).eq("id", user.id).select("*").single(),
  ) as Promise<Tables<"users">>;
};

export const checkHandleAvailability = async (handle: string): Promise<boolean> => {
  try {
    const response = await fetch("/api/users/check-handle-availability", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ handle }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to check handle availability");
    }

    const data = await response.json();
    console.log("checkHandleAvailability", data);
    return data.available;
  } catch (error) {
    console.error("Error checking handle availability:", error);
    throw error;
  }
};
