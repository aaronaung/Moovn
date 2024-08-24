import { supaClientComponentClient } from "@/src/data/clients/browser";
import { SupabaseOptions } from "../data/clients/types";
import { SupabaseClient } from "@supabase/supabase-js";

// NOTE: This function does something very specific. It constructs a supabase storage object url with the timestamp as the version attached to the url as query param. This is usually used to bust the cache on the image url.
export const getTimestampedObjUrl = (
  bucket: string,
  path: string,
  timestamp?: string | null,
): string => {
  const { data } = supaClientComponentClient.storage.from(bucket).getPublicUrl(path);

  if (!timestamp) {
    return data.publicUrl;
  }

  const imgVersion = new Date(timestamp).getTime();
  const url = new URL(data.publicUrl);
  url.searchParams.set("version", imgVersion.toString());
  return url.toString();
};

export const signUrl = async ({
  bucket,
  objectPath,
  expiresIn = 24 * 3600,
  isUpload = false, // this is legacy
  client,
}: {
  bucket: string;
  objectPath: string;
  expiresIn?: number;
  isUpload?: boolean;
  client: SupabaseOptions["client"];
}) => {
  const bucketClient = client.storage.from(bucket);

  const { data, error } = isUpload
    ? await bucketClient.createSignedUploadUrl(objectPath)
    : await bucketClient.createSignedUrl(objectPath, expiresIn);

  if (!data?.signedUrl) {
    throw new Error(
      `Failed to sign ${isUpload ? "upload " : ""}url for path ${bucket}/${objectPath}: ${error}`,
    );
  }
  return data?.signedUrl;
};

export const signUploadUrl = async ({
  bucket,
  objectPath,
  client,
}: {
  bucket: string;
  objectPath: string;

  client: SupabaseOptions["client"];
}) => {
  const bucketClient = client.storage.from(bucket);

  const { data, error } = await bucketClient.createSignedUploadUrl(objectPath);

  if (!data?.signedUrl || !data?.token) {
    throw new Error(`Failed to sign upload url for path ${bucket}/${objectPath}: ${error}`);
  }
  return {
    signedUrl: data.signedUrl,
    token: data.token,
  };
};

export const checkIfObjectExistsAtUrl = async (url: string) => {
  try {
    const resp = await fetch(url, { method: "GET" });
    return resp.ok;
  } catch (err) {
    return false;
  }
};

export const upsertObjectAtPath = async ({
  bucket,
  objectPath,
  content,
  contentType,
  client,
}: {
  bucket: string;
  objectPath: string;
  content: ArrayBuffer;
  contentType: string;
  client: SupabaseOptions["client"];
}) => {
  // Unfortunately, we have to remove the existing files before uploading the new ones, because
  // createSignedUploadUrl fails if the file already exists.
  await client.storage.from(bucket).remove([objectPath]);
  const signedUrl = await signUploadUrl({
    bucket: bucket,
    objectPath: objectPath,
    client: client,
  });

  await client.storage.from(bucket).uploadToSignedUrl(objectPath, signedUrl.token, content, {
    contentType,
  });
};

// Returns path if it's not a directory, else returns all children paths.
export const signUrlForPathOrChildPaths = async (
  bucket: string,
  path: string,
  client: SupabaseClient,
): Promise<{ url: string; path: string }[]> => {
  const { data, error } = await client.storage.from(bucket).list(path);
  if (error) {
    throw new Error(error.message);
  }
  if (data.length === 0) {
    // The content is a single image.
    const signedUrl = await signUrl({
      bucket,
      client,
      objectPath: path,
    });
    return [
      {
        url: signedUrl,
        path,
      },
    ];
  }
  // The content is a directory.
  return await Promise.all(
    data.map(async (file) => {
      const objectPath = `${path}/${file.name}`;
      return {
        url: await signUrl({
          bucket,
          client,
          objectPath,
        }),
        path: objectPath,
      };
    }),
  );
};
