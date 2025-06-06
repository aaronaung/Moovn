import { SupabaseOptions } from "./clients/types";
import { throwOrData } from "./util";
import { Tables, TablesInsert } from "@/types/db";

export interface CreateStudioInstructorLinkParams {
  instructor_email: string;
  source_id: string;
  id_in_source: string;
}

/**
 * Creates a new studio instructor link (invitation)
 * Creates a pending invitation with the email
 * If a link already exists, updates it with the new email
 */
export const createStudioInstructorLink = async (
  params: CreateStudioInstructorLinkParams,
  { client }: SupabaseOptions,
): Promise<Tables<"studio_instructor_links">> => {
  // Get the current user (studio)
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();

  if (authError || !user) {
    throw new Error("User not authenticated");
  }

  // Check if a link already exists for this combination
  const existingLinkQuery = client
    .from("studio_instructor_links")
    .select("*")
    .eq("studio_id", user.id)
    .eq("source_id", params.source_id)
    .eq("id_in_source", params.id_in_source);

  const existingLink = await throwOrData(existingLinkQuery.maybeSingle());

  // Prepare the link data
  const linkData: Partial<TablesInsert<"studio_instructor_links">> = {
    studio_id: user.id,
    source_id: params.source_id,
    id_in_source: params.id_in_source,
    status: "pending",
    invited_at: new Date().toISOString(),
    instructor_email: params.instructor_email,
  };

  if (existingLink) {
    // Update existing link
    return throwOrData(
      client
        .from("studio_instructor_links")
        .update(linkData)
        .eq("id", existingLink.id)
        .select("*")
        .single(),
    ) as Promise<Tables<"studio_instructor_links">>;
  } else {
    // Create new link
    return throwOrData(
      client
        .from("studio_instructor_links")
        .insert(linkData as TablesInsert<"studio_instructor_links">)
        .select("*")
        .single(),
    ) as Promise<Tables<"studio_instructor_links">>;
  }
};

/**
 * Gets all studio instructor links for the current studio
 */
export const getStudioInstructorLinks = async ({
  client,
}: SupabaseOptions): Promise<Tables<"studio_instructor_links">[]> => {
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();

  if (authError || !user) {
    throw new Error("User not authenticated");
  }

  return throwOrData(
    client
      .from("studio_instructor_links")
      .select("*")
      .eq("studio_id", user.id)
      .order("invited_at", { ascending: false }),
  ) as Promise<Tables<"studio_instructor_links">[]>;
};

/**
 * Gets all studio links for the current instructor (instructor view)
 */
export const getInstructorStudioLinks = async ({
  client,
}: SupabaseOptions): Promise<
  (Tables<"studio_instructor_links"> & { studio: Tables<"users">; source: Tables<"sources"> })[]
> => {
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();

  if (authError || !user || !user.email) {
    throw new Error("User not authenticated or email not available");
  }

  return throwOrData(
    client
      .from("studio_instructor_links")
      .select(
        `
        *,
        studio:users!studio_id(*),
        source:sources(*)
      `,
      )
      .eq("instructor_email", user.email)
      .order("invited_at", { ascending: false }),
  ) as unknown as (Tables<"studio_instructor_links"> & {
    studio: Tables<"users">;
    source: Tables<"sources">;
  })[];
};

/**
 * Updates the status of a studio instructor link (for instructors to accept/deny)
 */
export const updateStudioInstructorLinkStatus = async (
  { linkId, status }: { linkId: string; status: "accepted" | "denied" },
  { client }: SupabaseOptions,
): Promise<Tables<"studio_instructor_links">> => {
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();

  if (authError || !user || !user.email) {
    throw new Error("User not authenticated or email not available");
  }

  return throwOrData(
    client
      .from("studio_instructor_links")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", linkId)
      .eq("instructor_email", user.email)
      .select("*")
      .single(),
  ) as Promise<Tables<"studio_instructor_links">>;
};

/**
 * Gets all sources (studios) that the current instructor is linked to
 * Only returns accepted links
 */
export const getInstructorLinkedSources = async ({ client }: SupabaseOptions) => {
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();

  if (authError || !user || !user.email) {
    throw new Error("User not authenticated or email not available");
  }

  return throwOrData(
    client
      .from("studio_instructor_links")
      .select(
        `
        *,
        studio:users!studio_id(*),
        source:sources(*)
      `,
      )
      .eq("instructor_email", user.email)
      .eq("status", "accepted")
      .order("invited_at", { ascending: false }),
  );
};

/**
 * Gets instructor's linked sources by handle (public access)
 * Only returns accepted links for public viewing
 */
export const getInstructorLinkedSourcesByHandle = async (
  handle: string,
  { client }: SupabaseOptions,
) => {
  // First get the instructor by handle
  const instructor = await throwOrData(
    client
      .from("users")
      .select("id, first_name, last_name, avatar_url, handle, type, email")
      .eq("handle", handle)
      .eq("type", "instructor")
      .single(),
  );

  if (!instructor || !instructor.email) {
    throw new Error("Instructor not found or email not available");
  }

  // Then get their linked sources using email
  const links = await throwOrData(
    client
      .from("studio_instructor_links")
      .select(
        `
        *,
        studio:users!studio_id(*),
        source:sources(*)
      `,
      )
      .eq("instructor_email", instructor.email)
      .eq("status", "accepted")
      .order("invited_at", { ascending: false }),
  );

  return {
    instructor,
    links,
  };
};
