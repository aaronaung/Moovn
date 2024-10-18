import Dexie, { EntityTable } from "dexie";
import { ContentItemMetadata } from "@/src/consts/content";
import { ContentItemType } from "@/src/consts/content";
import { TemplateItemMetadata } from "@/src/consts/templates";

// IDB is designed to mirror the respective db tables as closely as possible, with additional fields for caching and offline support.

export type ContentItem = {
  // `${sourceId}/${range}/${templateItemId} for daily schedule, the range is the date, for weekly schedule, this is "start - end"
  // Because content items aren't created until they are scheduled, this is the key for the content item.
  key: string;
  content_idb_key: string; // This is the key for the parent content this content item belongs to. This helps us identify the content item when the content is scheduled.

  template_id: string;
  template_item_id: string;
  type: ContentItemType;
  position: number;
  metadata?: ContentItemMetadata;
  hash?: string; // used to determine if the content data needs to be updated.
  created_at: Date;
  updated_at: Date;

  // Extra fields
  psd?: ArrayBuffer;
  jpg?: ArrayBuffer;
};

export type TemplateItem = {
  key: string; // templateItemId.

  template_id: string;
  type: ContentItemType; // template for content item type
  position: number;
  metadata?: TemplateItemMetadata;
  created_at: Date;
  updated_at: Date;

  // Extra fields
  psd?: ArrayBuffer;
  jpg?: ArrayBuffer;
};

export const db = new Dexie("moovn") as Dexie & {
  contentItems: EntityTable<ContentItem, "key">;
  templateItems: EntityTable<TemplateItem, "key">;
};

db.version(1).stores({
  contentItems:
    "key, template_id, template_item_id, type, position, metadata, hash, created_at, updated_at, psd, jpg",
  templateItems: "key, template_id, type, position, metadata, created_at, updated_at, psd, jpg",
});
