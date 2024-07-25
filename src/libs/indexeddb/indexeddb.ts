import Dexie, { EntityTable } from "dexie";
import { InstagramTag } from "../designs/photopea";

export type Design = {
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
  designs: EntityTable<Design, "templateId">;
  templates: EntityTable<Template, "templateId">;
};

db.version(1).stores({
  designs: "templateId, psd, jpg, hash, instagramTags, lastUpdated",
  templates: "templateId, psd, jpg, lastUpdated",
});
