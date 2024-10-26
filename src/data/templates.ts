import { Tables } from "@/types/db";
import { SupabaseOptions } from "./clients/types";
import { getAuthUser } from "./users";
import { throwOrData } from "./util";
import { SourceDataView } from "../consts/sources";
import { deleteObject } from "./r2";
import _ from "lodash";
import { db } from "../libs/indexeddb/indexeddb";

export const getAllTemplates = async ({ client }: SupabaseOptions) => {
  return throwOrData(
    client
      .from("templates")
      .select("*, template_items(*, template_item_design_requests(*))")
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
      .upsert(_.omit(template, ["template_item_design_requests"]) as Tables<"templates">)
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
  await db.templateItems.where("template_id").equals(template.id).delete();
  await db.contentItems.where("template_id").equals(template.id).delete();
  return resp;
};

export const saveTemplateItemDesignRequest = async (
  designRequest: Partial<Tables<"template_item_design_requests">>,
  { client }: SupabaseOptions,
) => {
  return throwOrData(
    client
      .from("template_item_design_requests")
      .upsert(designRequest as Tables<"template_item_design_requests">)
      .select("*")
      .single(),
  );
};

export const saveTemplateItem = async (
  templateItem: Partial<Tables<"template_items">>,
  { client }: SupabaseOptions,
) => {
  return throwOrData(
    client
      .from("template_items")
      .upsert(templateItem as Tables<"template_items">)
      .select("*")
      .single(),
  );
};

export const deleteTemplateItem = async (id: string, { client }: SupabaseOptions) => {
  const resp = throwOrData(client.from("template_items").delete().eq("id", id));
  await db.templateItems.delete(id);
  await db.contentItems.where("template_item_id").equals(id).delete();
  return resp;
};

export const getTemplateItemsByTemplateId = async (
  templateId: string,
  { client }: SupabaseOptions,
) => {
  return throwOrData(
    client.from("template_items").select("*").eq("template_id", templateId).order("position"),
  );
};

export const setTemplateItemOrder = async (
  order: { id: string; position: number }[],
  { client }: SupabaseOptions,
) => {
  for (const item of order) {
    db.templateItems.update(item.id, { position: item.position });
  }
  return throwOrData(
    client.rpc("update_template_items_position", {
      items: order,
    }),
  );
};

export const getTemplateItemsBySourceId = async (sourceId: string, { client }: SupabaseOptions) => {
  return throwOrData(
    client.from("template_items").select("*").eq("metadata->>drive_source_id", sourceId),
  );
};
