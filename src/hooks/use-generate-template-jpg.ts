import { Tables } from "@/types/db";
import { usePhotopeaHeadless } from "../contexts/photopea-headless";
import { useState } from "react";
import { addHeadlessPhotopeaToDom } from "../libs/designs/photopea/utils";
import { db } from "../libs/indexeddb/indexeddb";

export const useGenerateTemplateJpg = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);
  const { initialize } = usePhotopeaHeadless();
  const [templateJpg, setTemplateJpg] = useState<ArrayBuffer | null>(null);

  const generateTemplateJpg = async ({
    template,
    templatePath,
    signedTemplateUrl,
  }: {
    template: Tables<"templates">;
    templatePath: string;
    signedTemplateUrl: string;
  }) => {
    setIsLoading(true);
    const templateFile = await (await fetch(signedTemplateUrl)).arrayBuffer();

    const photopeaEl = addHeadlessPhotopeaToDom();
    initialize(templatePath, photopeaEl, {
      initialData: templateFile,
      onDesignExport: async (designExport) => {
        if (designExport?.["jpg"]) {
          await db.templates.put({
            key: templatePath,
            jpg: designExport["jpg"],
            psd: templateFile,
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
