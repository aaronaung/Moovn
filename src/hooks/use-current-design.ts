import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../libs/indexeddb/indexeddb";
import { BUCKETS } from "../consts/storage";
import { Tables } from "@/types/db";
import { useSignedUrl } from "./use-signed-url";
import { useEffect, useState } from "react";
import { useGenerateDesign } from "./use-generate-design";
import { supaClientComponentClient } from "../data/clients/browser";

export const useCurrentDesign = (template: Tables<"templates"> & { source: Tables<"sources"> | null }) => {
  const { generateDesign, isLoading: isGeneratingDesign, isScheduleEmpty } = useGenerateDesign();
  const [designOverwrite, setDesignOverwrite] = useState<{ jpgUrl: string; psdUrl: string } | null>(null);

  const { signedUrl: overwritePsdSignedUrl, loading: isLoadingOverwritePsdSignedUrl } = useSignedUrl({
    bucket: BUCKETS.designs,
    objectPath: `${template.owner_id}/${template.id}.psd`,
  });
  const { signedUrl: overwriteJpgSignedUrl, loading: isLoadingOverwriteJpgSignedUrl } = useSignedUrl({
    bucket: BUCKETS.designs,
    objectPath: `${template.owner_id}/${template.id}.jpeg`,
  });

  useEffect(() => {
    if (isLoadingOverwriteJpgSignedUrl || isLoadingOverwritePsdSignedUrl) {
      return;
    }
    if (overwriteJpgSignedUrl && overwritePsdSignedUrl) {
      setDesignOverwrite({
        jpgUrl: overwriteJpgSignedUrl,
        psdUrl: overwritePsdSignedUrl,
      });
      return;
    }
    generateDesign(template);
  }, [isLoadingOverwriteJpgSignedUrl, isLoadingOverwritePsdSignedUrl, overwriteJpgSignedUrl, overwritePsdSignedUrl]);

  const designFromIndexedDb = useLiveQuery(async () => {
    const design = await db.designs.get(template.id);
    if (!design) {
      return undefined;
    }
    return {
      jpgUrl: URL.createObjectURL(new Blob([design.jpg], { type: "image/jpeg" })),
      psdUrl: URL.createObjectURL(new Blob([design.psd], { type: "image/vnd.adobe.photoshop" })),
    };
  });

  const removeOverwrite = async () => {
    await supaClientComponentClient.storage
      .from(BUCKETS.designs)
      .remove([`${template.owner_id}/${template.id}.psd`, `${template.owner_id}/${template.id}.jpeg`]);

    setDesignOverwrite(null);
    generateDesign(template);
  };

  const designJpgUrl = designOverwrite?.jpgUrl || designFromIndexedDb?.jpgUrl;
  const designPsdUrl = designOverwrite?.psdUrl || designFromIndexedDb?.psdUrl;

  return {
    isScheduleEmpty,
    isLoadingDesign: isLoadingOverwritePsdSignedUrl || isLoadingOverwriteJpgSignedUrl || isGeneratingDesign,
    design: {
      jpgUrl: designJpgUrl,
      psdUrl: designPsdUrl,
      isOverwritten: !!designOverwrite,
    },
    removeOverwrite,
  };
};
