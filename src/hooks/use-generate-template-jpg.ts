import { Tables } from "@/types/db";
import { usePhotopeaHeadless } from "../contexts/photopea-headless";
import { useState } from "react";
import { addHeadlessPhotopeaToDom } from "../libs/designs/photopea/utils";
import { db } from "../libs/indexeddb/indexeddb";
import { signUrl } from "../data/r2";
import { ContentItemType } from "../consts/content";
import { templateItemR2Path } from "../libs/storage";

export const useGenerateTemplateJpg = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { initialize } = usePhotopeaHeadless();

  const generateTemplateJpgSync = async ({
    id,
    templateData,
  }: {
    id: string;
    templateData: ArrayBuffer;
  }): Promise<ArrayBuffer> => {
    return new Promise(async (resolve, reject) => {
      const photopeaEl = addHeadlessPhotopeaToDom();
      initialize(id, photopeaEl, {
        initialData: templateData,
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
    templateItem,
    signedTemplateUrl,
    templateData,
  }: {
    template: Tables<"templates">;
    templateItem: Tables<"template_items">;
    signedTemplateUrl?: string;
    templateData?: ArrayBuffer;
  }) => {
    setIsLoading(true);
    if (!templateData) {
      signedTemplateUrl = await signUrl(
        "templates",
        templateItemR2Path(template.owner_id, template.id, templateItem.id),
      );
    }
    const psdArrayBuffer = templateData ?? (await (await fetch(signedTemplateUrl!)).arrayBuffer());

    const photopeaEl = addHeadlessPhotopeaToDom(true);
    initialize(templateItem.id, photopeaEl, {
      initialData: psdArrayBuffer,
      onDesignExport: async (designExport) => {
        if (designExport?.["jpg"]) {
          await db.templateItems.put({
            key: templateItem.id,
            template_id: template.id,
            type: ContentItemType.AutoGenDesign,
            position: templateItem.position,
            jpg: designExport["jpg"],
            psd: psdArrayBuffer,
            updated_at: new Date(),
            created_at: new Date(),
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
