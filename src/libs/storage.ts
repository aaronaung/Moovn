export const driveSyncFilePath = (
  ownerId: string,
  folderId: string,
  date: string,
  fname: string,
) => {
  return `${ownerId}/${folderId}/${date}/${fname}`;
};
