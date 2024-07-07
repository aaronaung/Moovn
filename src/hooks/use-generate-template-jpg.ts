import { Tables } from "@/types/db";
import { usePhotopeaHeadless } from "../contexts/photopea-headless";
import { supaClientComponentClient } from "../data/clients/browser";
import { signUrl } from "../libs/storage";
import { BUCKETS } from "../consts/storage";
import { exportCmd } from "../libs/designs/photopea";
import { useState } from "react";
import { sleep } from "../utils";

export const useGenerateTemplateJpg = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);
  const { initialize, sendRawPhotopeaCmd } = usePhotopeaHeadless();
  const [templateJpg, setTemplateJpg] = useState<ArrayBuffer | null>(null);

  const generateTemplateJpg = async (template: Tables<"templates">, signedTemplateUrl?: string) => {
    try {
      setIsLoading(true);

      if (!signedTemplateUrl) {
        signedTemplateUrl = await signUrl({
          bucket: BUCKETS.templates,
          objectPath: `${template.owner_id}/${template.id}.psd`,
          client: supaClientComponentClient,
        });
      }

      const iframeSrc = `https://www.photopea.com#${JSON.stringify({
        files: [signedTemplateUrl],
        environment: {},
      })}`;
      const iframeEle = document.createElement("iframe");
      iframeEle.src = iframeSrc;
      iframeEle.className = "hidden";
      document.body.appendChild(iframeEle);

      initialize(template.id, {
        photopeaEl: iframeEle,
        onFileExport: async (fileExport) => {
          if (fileExport?.["jpg"]) {
            setTemplateJpg(fileExport["jpg"]);
          }
        },
        onLayerCountChange: () => {},
        onReady: async () => {
          const forcedRetryCount = 3;
          let retryCount = 0;
          while (retryCount < forcedRetryCount) {
            // We have to retry because the export command sometimes doesn't work on the first try. This is a hack.
            sendRawPhotopeaCmd(template.id, iframeEle, exportCmd(template.id));
            await sleep(300);
            retryCount++;
          }
        },
        onDone: () => {
          console.log("DONE removing iframe");
          document.body.removeChild(iframeEle);
        },
      });
    } catch (err) {
      console.error("failed to generate design", err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    generateTemplateJpg,
    templateJpg,
    isLoading,
    error,
  };
};
