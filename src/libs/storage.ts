export const driveSyncR2Path = (ownerId: string, folderId: string, date: string, fname: string) => {
  return `${ownerId}/${folderId}/${date}/${fname}`;
};

export const contentItemR2Path = (ownerId: string, contentId: string, contentItemId: string) => {
  return `${ownerId}/${contentId}/${contentItemId}`;
};

export const templateItemR2Path = (ownerId: string, templateId: string, templateItemId: string) => {
  return `${ownerId}/${templateId}/${templateItemId}`;
};

export const designOverwriteR2Path = (
  ownerId: string,
  contentItemIdbKey: string,
  extension: "psd" | "jpg",
) => {
  return `${ownerId}/${contentItemIdbKey}.${extension}`;
};

export const freeDesignTemplateR2Path = (
  contentType: string,
  fileName: string,
  version: number,
  extension: "psd" | "jpg",
) => {
  return `${contentType}/${fileName}.v${version}.${extension}`;
};
