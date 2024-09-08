import { listObjects, signUrl } from "../data/r2";
import { BucketName } from "./r2/r2-buckets";

// Returns path if it's not a directory, else returns all children paths.
export const signUrlForPathOrChildPaths = async (
  bucket: BucketName,
  path: string,
): Promise<{ url: string; path: string }[]> => {
  const objects = await listObjects(bucket, path);

  if (objects.length === 0) {
    // The content is a single image.
    const signedUrl = await signUrl(bucket, path);
    return [
      {
        url: signedUrl,
        path,
      },
    ];
  }

  // The content is a directory.
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
