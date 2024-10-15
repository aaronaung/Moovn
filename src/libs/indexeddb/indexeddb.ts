import Dexie, { EntityTable } from "dexie";
import { InstagramTag } from "../designs/photopea/utils";
import { ContentType } from "@/src/consts/content";
import { TemplateItemType } from "@/src/consts/templates";

export type ContentItem = {
  // `${sourceId}/${range}/${templateItemId} for daily schedule, the range is the date, for weekly schedule, this is "start - end"
  // Because content items aren't created until they are scheduled, this is the key for the content item.
  key: string;
  scheduledContentItemId?: string; // If this content item is scheduled, this is the id of the scheduled content item.
  templateItemId: string;
  position: number;

  // Applicable for Instagram content
  psd?: ArrayBuffer;
  jpg?: ArrayBuffer;
  instagramTags?: InstagramTag[];

  hash?: string; // used to determine if the content data needs to be updated.

  created_at: Date;
  updated_at: Date;
};

export type Content = {
  // `${sourceId}/${range}/${templateId} for daily schedule, the range is the date, for weekly schedule, this is "start - end"
  // Because content isn't created until they are scheduled, this is the key for the content.
  key: string;
  contentType: ContentType;

  // Applicable for Instagram content
  instagramCaption?: string;

  created_at: Date;
  updated_at: Date;
};

export type TemplateItem = {
  key: string; // templateItemId.
  templateId: string;
  itemType: TemplateItemType;
  position: number;

  // Applicable for Instagram template items
  psd?: ArrayBuffer;
  jpg?: ArrayBuffer;

  created_at: Date;
  updated_at: Date;
};

export const db = new Dexie("moovn") as Dexie & {
  contents: EntityTable<Content, "key">;
  contentItems: EntityTable<ContentItem, "key">;
  templateItems: EntityTable<TemplateItem, "key">;
};

db.version(1).stores({
  contents: "key, contentType, instagramCaption, created_at, updated_at",
  contentItems:
    "key, templateId, templateItemId, itemType, position, psd, jpg, hash, instagramTags, instagramCaption, updated_at",
  templateItems: "key, templateId, itemType, position, psd, jpg, updated_at",
});
