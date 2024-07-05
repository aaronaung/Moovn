import { Tables } from "@/types/db";
import { SupabaseOptions } from "./clients/types";
import { getAuthUser } from "./users";
import { throwOrData } from "./util";
import { BUCKETS } from "../consts/storage";
import { SourceDataView } from "../consts/sources";

export const getTemplatesForAuthUser = async ({ client }: SupabaseOptions) => {
  const user = await getAuthUser({ client });
  if (!user) {
    return [];
  }

  return throwOrData(
    client
      .from("templates")
      .select("*, source:sources(*)")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
  );
};

export const getTemplateById = async (id: string, { client }: SupabaseOptions) => {
  return throwOrData(client.from("templates").select("*, source:sources(*)").eq("id", id).maybeSingle());
};

export const getTemplatesBySchedule = async (schedule: SourceDataView, { client }: SupabaseOptions) => {
  const user = await getAuthUser({ client });
  if (!user) {
    return [];
  }

  return throwOrData(
    client
      .from("templates")
      .select("*, source:sources(*)")
      .eq("source_data_view", schedule)
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
  );
};

export const saveTemplate = async (template: Partial<Tables<"templates">>, { client }: SupabaseOptions) => {
  return throwOrData(
    client
      .from("templates")
      .upsert(template as Tables<"templates">)
      .single(),
  );
};

export const deleteTemplate = async (template: Tables<"templates">, { client }: SupabaseOptions) => {
  const resp = throwOrData(client.from("templates").delete().eq("id", template.id));
  await client.storage.from(BUCKETS.templates).remove([`${template.owner_id}/${template.id}.psd`]);

  return resp;
};

export const getTemplatesForPost = async (postId: string, { client }: SupabaseOptions) => {
  const templates = await throwOrData(
    client.from("posts_templates").select("template:templates(*, source:sources(*))").eq("post_id", postId),
  );

  return templates.map((t) => t.template).filter((t) => t !== null) as (Tables<"templates"> & {
    source: Tables<"sources"> | null;
  })[];
};
