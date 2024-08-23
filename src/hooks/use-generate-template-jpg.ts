import { Tables } from "@/types/db";
import { usePhotopeaHeadless } from "../contexts/photopea-headless";
import { useState } from "react";
import { addHeadlessPhotopeaToDom } from "../libs/designs/photopea";
import { db } from "../libs/indexeddb/indexeddb";

export const useGenerateTemplateJpg = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);
  const { initialize } = usePhotopeaHeadless();
  const [templateJpg, setTemplateJpg] = useState<ArrayBuffer | null>(null);

  const generateTemplateJpg = async ({
    template,
    templatePath,
    templatePsd,
  }: {
    template: Tables<"templates">;
    templatePath: string;
    templatePsd: ArrayBuffer;
  }) => {
    setIsLoading(true);
    const photopeaEl = addHeadlessPhotopeaToDom();
    initialize(template.id, photopeaEl, {
      initialData: templatePsd,
      onDesignExport: async (designExport) => {
        if (designExport?.["jpg"]) {
          await db.templates.put({
            key: templatePath,
            jpg: designExport["jpg"],
            psd: templatePsd,
            templateId: template.id,
            lastUpdated: new Date(),
          });
          if (document.body.contains(photopeaEl)) {
            document.body.removeChild(photopeaEl);
          }
          setIsLoading(false);
        }
      },
    });
  };

  return {
    generateTemplateJpg,
    templateJpg,
    isLoading,
    error,
  };
};
