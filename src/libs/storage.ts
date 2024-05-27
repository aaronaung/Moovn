import { supaClientComponentClient } from "@/src/data/clients/browser";

// NOTE: This function does something very specific. It constructs a supabase storage object url with the timestamp as the version attached to the url as query param. This is usually used to bust the cache on the image url.
export const getTimestampedObjUrl = (
  bucket: string,
  path: string,
  timestamp?: string | null,
): string => {
  const { data } = supaClientComponentClient.storage
    .from(bucket)
    .getPublicUrl(path);

  if (!timestamp) {
    return data.publicUrl;
  }

  const imgVersion = new Date(timestamp).getTime();
  const url = new URL(data.publicUrl);
  url.searchParams.set("version", imgVersion.toString());
  return url.toString();
};

export const signUrl = async (
  bucket: string,
  objectPath: string,
  expiresIn: number = 24 * 3600,
) => {
  const { data } = await supaClientComponentClient.storage
    .from(bucket)
    .createSignedUrl(objectPath, expiresIn);
  return data?.signedUrl;
};

export const checkIfObjectExistsAtUrl = async (url: string) => {
  try {
    const resp = await fetch(url, { method: "GET" });
    return resp.ok;
  } catch (err) {
    return false;
  }
};
