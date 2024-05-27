import { useEffect, useState } from "react";
import { supaClientComponentClient } from "../data/clients/browser";

export const useSignedUrl = ({
  bucket,
  objectPath,
  initialUrl,
}: {
  bucket: string;
  objectPath: string;
  initialUrl?: string;
}) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(initialUrl ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    sign();
  }, [bucket, objectPath]);

  useEffect(() => {
    if (!signedUrl) {
      sign();
    }
  }, [signedUrl]);

  const sign = async () => {
    try {
      setLoading(true);
      if (signedUrl) {
        const resp = await fetch(signedUrl, { method: "GET" });
        if (resp.ok) {
          setLoading(false);
          return;
        }
      }

      const { data } = await supaClientComponentClient.storage
        .from(bucket)
        .createSignedUrl(objectPath, 24 * 3600);
      if (!data?.signedUrl) {
        throw new Error("Signed url not found in createSignUrl response.");
      }
      setSignedUrl(data.signedUrl);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { signedUrl, loading, error, refresh: sign };
};
