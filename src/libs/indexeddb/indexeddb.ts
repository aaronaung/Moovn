import Dexie, { EntityTable } from "dexie";
import { InstagramTag } from "../designs/photopea";

export type Design = {
  key: string; // for daily schedule, this is the date, for weekly schedule, this is "start - end"
  templateId: string;
  psd: ArrayBuffer;
  jpg: ArrayBuffer;
  hash: string;
  instagramTags: InstagramTag[];
  lastUpdated: Date;
};

export type Template = {
  templateId: string;
  psd: ArrayBuffer;
  jpg: ArrayBuffer;
  lastUpdated: Date;
};

export const db = new Dexie("moovn") as Dexie & {
  designs: EntityTable<Design, "key">;
  templates: EntityTable<Template, "templateId">;
};

db.version(2).stores({
  designs: "key, templateId, psd, jpg, hash, instagramTags, lastUpdated",
  templates: "templateId, psd, jpg, lastUpdated",
});
