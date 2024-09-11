import Dexie, { EntityTable } from "dexie";
import { InstagramTag } from "../designs/photopea/utils";

export type Design = {
  key: string; // `${ownerId}/${range}/${templateId} for daily schedule, the range is the date, for weekly schedule, this is "start - end"
  templateId: string;
  psd: ArrayBuffer;
  jpg: ArrayBuffer;
  hash: string;
  instagramTags: InstagramTag[];
  lastUpdated: Date;
};

export type Template = {
  key: string; // `${ownerId}/${templateId}`
  templateId: string;
  psd: ArrayBuffer;
  jpg: ArrayBuffer;
  lastUpdated: Date;
};

export const db = new Dexie("moovn") as Dexie & {
  designs: EntityTable<Design, "key">;
  templates: EntityTable<Template, "key">;
};

db.version(3).stores({
  designs: "key, templateId, psd, jpg, hash, instagramTags, lastUpdated",
  templates: "key, templateId, psd, jpg, lastUpdated",
});
