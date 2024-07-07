import Dexie, { EntityTable } from "dexie";

export type Design = {
  templateId: string;
  psd: ArrayBuffer;
  jpg: ArrayBuffer;
  hash: string;
  lastUpdated: Date;
};

export const db = new Dexie("moovn") as Dexie & {
  designs: EntityTable<Design, "templateId">;
};

db.version(1).stores({
  designs: "templateId, psd, jpg, hash, lastUpdated",
});
