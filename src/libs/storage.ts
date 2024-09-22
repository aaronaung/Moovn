import { listObjects, signUrl } from "../data/r2";
import { BucketName } from "./r2/r2-buckets";

// Returns path if it's not a directory, else returns all children paths.
export const getSignedUrls = async (
  bucket: BucketName,
  path: string,
  isDirectory: boolean,
): Promise<{ url: string; path: string }[]> => {
  if (!isDirectory) {
    const signedUrl = await signUrl(bucket, path);
    return [
      {
        url: signedUrl,
        path,
      },
    ];
  }

  const objects = await listObjects(bucket, path);
  return await Promise.all(
    objects.map(async (object) => {
      const objectPath = object.Key || "";
      return {
        url: await signUrl(bucket, objectPath),
        path: objectPath,
      };
    }),
  );
};
