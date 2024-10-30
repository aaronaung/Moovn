export const driveSyncR2Path = (ownerId: string, folderId: string, date: string, fname: string) => {
  return `${ownerId}/${folderId}/${date}/${fname}`;
};

export const contentItemR2Path = (ownerId: string, contentId: string, contentItemId: string) => {
  return `${ownerId}/${contentId}/${contentItemId}`;
};
