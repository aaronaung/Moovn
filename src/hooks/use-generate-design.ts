import { Tables } from "@/types/db";
import { usePhotopeaHeadless } from "../contexts/photopea-headless";
import { getScheduleDataForSource } from "../data/sources";
import { SourceDataView } from "../consts/sources";
import { supaClientComponentClient } from "../data/clients/browser";
import { signUrl } from "../libs/storage";
import { BUCKETS } from "../consts/storage";
import { readPsd } from "ag-psd";
import { determineDesignGenSteps } from "../libs/designs/photoshop-v2";
import { db } from "../libs/indexeddb/indexeddb";
import { MD5 as hash } from "object-hash";
import { useState } from "react";
import { addHeadlessPhotopeaToDom } from "../libs/designs/photopea";

export const useGenerateDesign = () => {
  const [isScheduleEmpty, setIsScheduleEmpty] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);
  const { initialize } = usePhotopeaHeadless();

  /**
   *
   * @param template
   * @description generateDesign temporarily adds a headless photopea iframe to the document body,
   * initializes it with a template, use the schedule data to determine what psd actions to take,
   * then sends photopea commands to manipulate the template loaded in the iframe. Once the design is generated,
   * it saves the design to indexeddb, and removes the iframe from the document body.
   * @returns
   */
  const generateDesign = async (
    template: Tables<"templates">,
    source: {
      id: string;
      view: SourceDataView;
    },
    forceRefresh: boolean = false,
  ) => {
    console.log("generating design for template", template.id);
    try {
      setIsLoading(true);
      const [schedule, signedTemplateUrl] = await Promise.all([
        getScheduleDataForSource({
          id: source.id,
          view: source.view as SourceDataView,
        }),
        signUrl({
          bucket: BUCKETS.designTemplates,
          objectPath: `${template.owner_id}/${template.id}.psd`,
          client: supaClientComponentClient,
        }),
      ]);

      const designHash = hash({
        templateId: template.id,
        schedule,
      });
      if (!forceRefresh) {
        const design = await db.designs.get(template.id);
        if (design?.hash === designHash) {
          console.info(
            `schedule data hasn't changed for template ${template.id} - skipping design generation`,
          );
          return;
        }
      }
      const designInIndexedDb = await db.designs.get(template.id);
      if (designInIndexedDb && designInIndexedDb.hash !== designHash) {
        // Schedule data has changed, delete the overwritten design.
        await db.designs.delete(template.id);
        await supaClientComponentClient.storage
          .from(BUCKETS.designOverwrites)
          .remove([
            `${template.owner_id}/${template.id}.psd`,
            `${template.owner_id}/${template.id}.jpg`,
          ]);
      }

      if (Object.keys(schedule).length === 0) {
        setIsScheduleEmpty(true);
        return;
      }

      const templateFile = await (await fetch(signedTemplateUrl)).arrayBuffer();
      const psd = readPsd(templateFile);
      const designGenSteps = determineDesignGenSteps(schedule, psd);

      const photopeaEl = addHeadlessPhotopeaToDom();
      initialize(template.id, photopeaEl, {
        initialData: templateFile,
        designGenSteps,
        onTimeout: () => {
          if (document.body.contains(photopeaEl)) {
            document.body.removeChild(photopeaEl);
          }
        },
        onDesignExport: async (designExport) => {
          if (designExport?.["psd"] && designExport?.["jpg"]) {
            await db.designs.put({
              templateId: template.id,
              jpg: designExport["jpg"],
              psd: designExport["psd"],
              hash: designHash,
              instagramTags: designExport.instagramTags,
              lastUpdated: new Date(),
            });
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
    generateDesign,
    isScheduleEmpty,
    isLoading,
    error,
  };
};
