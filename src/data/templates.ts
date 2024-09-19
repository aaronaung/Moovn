import { Tables } from "@/types/db";
import { SupabaseOptions } from "./clients/types";
import { getAuthUser } from "./users";
import { throwOrData } from "./util";
import { SourceDataView } from "../consts/sources";
import { deleteObject } from "./r2";

export const getTemplatesForAuthUser = async ({ client }: SupabaseOptions) => {
  return throwOrData(
    client
      .from("templates")
      .select("*, template_creation_requests(*)")
      .order("created_at", { ascending: false }),
  );
};

export const getTemplateById = async (id: string, { client }: SupabaseOptions) => {
  return throwOrData(client.from("templates").select("*").eq("id", id).maybeSingle());
};

export const getTemplatesByIds = async (ids: string[], { client }: SupabaseOptions) => {
  return throwOrData(client.from("templates").select("*").in("id", ids));
};

export const getTemplatesByScheduleAndContentType = async (
  { scheduleType, contentType }: { scheduleType: SourceDataView; contentType: string },
  { client }: SupabaseOptions,
) => {
  const user = await getAuthUser({ client });
  if (!user) {
    return [];
  }

  return throwOrData(
    client
      .from("templates")
      .select("*")
      .eq("source_data_view", scheduleType)
      .eq("content_type", contentType)
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
  );
};

export const saveTemplate = async (
  template: Partial<Tables<"templates">>,
  { client }: SupabaseOptions,
) => {
  return throwOrData(
    client
      .from("templates")
      .upsert(template as Tables<"templates">)
      .select("*")
      .single(),
  );
};

export const deleteTemplate = async (
  template: Tables<"templates">,
  { client }: SupabaseOptions,
) => {
  const resp = throwOrData(client.from("templates").delete().eq("id", template.id));
  await deleteObject("templates", `${template.owner_id}/${template.id}`);
  return resp;
};

export const saveTemplateCreationRequest = async (
  templateCreationRequest: Partial<Tables<"template_creation_requests">>,
  { client }: SupabaseOptions,
) => {
  return throwOrData(
    client
      .from("template_creation_requests")
      .upsert(templateCreationRequest as Tables<"template_creation_requests">)
      .select("*")
      .single(),
  );
};
