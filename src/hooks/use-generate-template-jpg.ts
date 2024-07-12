import { Tables } from "@/types/db";
import { usePhotopeaHeadless } from "../contexts/photopea-headless";
import { exportCmd } from "../libs/designs/photopea";
import { useState } from "react";
import { sleep } from "../utils";

export const useGenerateTemplateJpg = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);
  const { initialize, sendRawPhotopeaCmd } = usePhotopeaHeadless();
  const [templateJpg, setTemplateJpg] = useState<ArrayBuffer | null>(null);

  const generateTemplateJpg = async (template: Tables<"templates">, templateData: ArrayBuffer) => {
    try {
      setIsLoading(true);

      const iframeSrc = `https://www.photopea.com#${JSON.stringify({
        files: [],
        environment: {},
      })}`;
      const iframeEle = document.createElement("iframe");
      iframeEle.src = iframeSrc;
      iframeEle.className = "hidden";
      document.body.appendChild(iframeEle);

      initialize(template.id, {
        photopeaEl: iframeEle,
        initialData: templateData,
        onInitialDataLoaded: async () => {
          const forcedRetryCount = 3;
          let retryCount = 0;
          while (retryCount < forcedRetryCount) {
            // We have to retry because the export command sometimes doesn't work on the first try. This is a hack.
            sendRawPhotopeaCmd(template.id, iframeEle, exportCmd(template.id));
            await sleep(300);
            retryCount++;
          }
        },
        onFileExport: async (fileExport) => {
          if (fileExport?.["jpg"]) {
            setTemplateJpg(fileExport["jpg"]);
          }
        },
        onIdleTimeout: () => {
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
