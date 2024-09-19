import { Tables } from "@/types/db";
import { usePhotopeaHeadless } from "../contexts/photopea-headless";
import { useState } from "react";
import { addHeadlessPhotopeaToDom } from "../libs/designs/photopea/utils";
import { db } from "../libs/indexeddb/indexeddb";

export const useGenerateTemplateJpg = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { initialize } = usePhotopeaHeadless();

  const generateTemplateJpgSync = async ({
    templatePath,
    signedTemplateUrl,
    templateData,
  }: {
    templatePath: string;
    signedTemplateUrl?: string;
    templateData?: ArrayBuffer;
  }): Promise<ArrayBuffer> => {
    return new Promise(async (resolve, reject) => {
      if (!templateData && !signedTemplateUrl) {
        reject("Either templateFile or signedTemplateUrl must be provided");
      }
      const psdArrayBuffer =
        templateData ?? (await (await fetch(signedTemplateUrl!)).arrayBuffer());
      const photopeaEl = addHeadlessPhotopeaToDom();
      initialize(templatePath, photopeaEl, {
        initialData: psdArrayBuffer,
        onTimeout: () => {
          reject("Photopea timeout");
        },
        onDesignExport: async (designExport) => {
          if (designExport?.["jpg"]) {
            if (document.body.contains(photopeaEl)) {
              document.body.removeChild(photopeaEl);
            }
            resolve(designExport["jpg"]);
          } else {
            reject("No jpg export from photopea");
          }
        },
      });
    });
  };

  const generateTemplateJpg = async ({
    template,
    templatePath,
    signedTemplateUrl,
    templateData,
  }: {
    template: Tables<"templates">;
    templatePath: string;
    signedTemplateUrl?: string;
    templateData?: ArrayBuffer;
  }) => {
    if (!templateData && !signedTemplateUrl) {
      throw new Error("Either templateFile or signedTemplateUrl must be provided");
    }
    setIsLoading(true);
    const psdArrayBuffer = templateData ?? (await (await fetch(signedTemplateUrl!)).arrayBuffer());

    const photopeaEl = addHeadlessPhotopeaToDom();
    initialize(templatePath, photopeaEl, {
      initialData: psdArrayBuffer,
      onDesignExport: async (designExport) => {
        if (designExport?.["jpg"]) {
          await db.templates.put({
            key: templatePath,
            jpg: designExport["jpg"],
            psd: psdArrayBuffer,
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
    generateTemplateJpgSync,
    generateTemplateJpg,
    isLoading,
  };
};
