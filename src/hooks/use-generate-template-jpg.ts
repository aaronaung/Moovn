import { Tables } from "@/types/db";
import { usePhotopeaHeadless } from "../contexts/photopea-headless";
import { useState } from "react";
import { addHeadlessPhotopeaToDom } from "../libs/designs/photopea";

export const useGenerateTemplateJpg = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);
  const { initialize } = usePhotopeaHeadless();
  const [templateJpg, setTemplateJpg] = useState<ArrayBuffer | null>(null);

  const generateTemplateJpg = async (template: Tables<"templates">, templateData: ArrayBuffer) => {
    try {
      setIsLoading(true);

      const photopeaEl = addHeadlessPhotopeaToDom();
      initialize(template.id, photopeaEl, {
        initialData: templateData,
        onFileExport: async (fileExport) => {
          if (fileExport?.["jpg"]) {
            setTemplateJpg(fileExport["jpg"]);
            if (document.body.contains(photopeaEl)) {
              document.body.removeChild(photopeaEl);
            }
          }
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
