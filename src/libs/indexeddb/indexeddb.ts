import Dexie, { EntityTable } from "dexie";
import { ContentItemMetadata, ContentMetadata, ContentType } from "@/src/consts/content";
import { ContentItemType } from "@/src/consts/content";
import { TemplateItemMetadata } from "@/src/consts/templates";
import { SourceDataView } from "@/src/consts/sources";

// IDB is designed to mirror the respective db tables as closely as possible, with additional fields for caching and offline support.

export type Content = {
  // `${sourceId}/${range}/${templateId} for daily schedule, the range is the date, for weekly schedule, this is "start - end"
  // Because content isn't created until they are scheduled, this is the key for the content.
  key: string;

  id?: string; // present if the content is already scheduled
  destination_id: string;
  template_id: string;
  metadata: ContentMetadata;
  type: ContentType;
  source_id: string;
  source_data_view: SourceDataView;
  created_at: Date;
  updated_at: Date;
};

export type ContentItem = {
  // `${sourceId}/${range}/${templateItemId} for daily schedule, the range is the date, for weekly schedule, this is "start - end"
  // Because content items aren't created until they are scheduled, this is the key for the content item.
  key: string;

  id?: string; // present if the content item is already scheduled
  content_id: string;
  template_item_id: string;
  type: ContentItemType;
  position: number;
  metadata: ContentItemMetadata;
  hash?: string; // used to determine if the content data needs to be updated.
  created_at: Date;
  updated_at: Date;

  // Extra fields
  psd?: ArrayBuffer;
  jpg?: ArrayBuffer;
};

export type TemplateItem = {
  key: string; // templateItemId.

  id: string;
  template_id: string;
  type: ContentItemType; // template for content item type
  position: number;
  metadata: TemplateItemMetadata;
  created_at: Date;
  updated_at: Date;

  // Extra fields
  psd?: ArrayBuffer;
  jpg?: ArrayBuffer;
};

export const db = new Dexie("moovn") as Dexie & {
  contents: EntityTable<Content, "key">;
  contentItems: EntityTable<ContentItem, "key">;
  templateItems: EntityTable<TemplateItem, "key">;
};

db.version(1).stores({
  contents:
    "key, destination_id, template_id, metadata, type, source_id, source_data_view, created_at, updated_at",
  contentItems:
    "key, content_id, template_item_id, type, position, metadata, hash, created_at, updated_at, psd, jpg",
  templateItems: "key, template_id, type, position, metadata, created_at, updated_at, psd, jpg",
});
