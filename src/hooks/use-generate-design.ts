import { Tables } from "@/types/db";
import { usePhotopeaHeadless } from "../contexts/photopea-headless";
import { supaClientComponentClient } from "../data/clients/browser";
import { BUCKETS } from "../consts/storage";
import { readPsd } from "ag-psd";
import { determineDesignGenSteps } from "../libs/designs/photoshop-v2";
import { db } from "../libs/indexeddb/indexeddb";
import { MD5 as hash } from "object-hash";
import { useState } from "react";
import { addHeadlessPhotopeaToDom } from "../libs/designs/photopea";
import { ScheduleData } from "../libs/sources/common";
import { startOfToday } from "date-fns";

export const useGenerateDesign = () => {
  const [isScheduleEmpty, setIsScheduleEmpty] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);
  const { initialize } = usePhotopeaHeadless();

  /**
   * @description generateDesignForSchedule temporarily adds a headless photopea iframe to the document body,
   * initializes it with a template, use the schedule data to determine what psd actions to take,
   * then sends photopea commands to manipulate the template loaded in the iframe. Once the design is generated,
   * it saves the design to indexeddb, and removes the iframe from the document body.
   */
  const generateDesignForSchedule = async ({
    contentPath,
    template,
    schedule,
    forceRefresh = false,
    signedTemplateUrl,
  }: {
    contentPath: string;
    template: Tables<"templates">;
    schedule: ScheduleData;
    forceRefresh?: boolean;
    signedTemplateUrl: string;
  }) => {
    try {
      setIsLoading(true);
      await db.designs.where("lastUpdated").below(startOfToday()).delete();
      const designHash = hash({
        templateId: template.id,
        schedule,
      });
      if (!forceRefresh) {
        const design = await db.designs.get(contentPath);
        if (design?.hash === designHash) {
          console.info(
            `schedule data hasn't changed for template ${template.id} - skipping design generation`,
          );
          setIsLoading(false);
          return;
        }
      }

      const designInIndexedDb = await db.designs.get(contentPath);
      if (designInIndexedDb && designInIndexedDb.hash !== designHash) {
        // Schedule data has changed, delete the overwritten design.
        await db.designs.delete(contentPath);
        await supaClientComponentClient.storage
          .from(BUCKETS.designOverwrites)
          .remove([`${contentPath}.psd`, `${contentPath}.jpg`]);
      }

      if (Object.keys(schedule).length === 0) {
        setIsScheduleEmpty(true);
        setIsLoading(false);
        return;
      }

      const templateFile = await (await fetch(signedTemplateUrl)).arrayBuffer();
      const psd = readPsd(templateFile);
      const designGenSteps = determineDesignGenSteps(schedule, psd);

      const photopeaEl = addHeadlessPhotopeaToDom();
      initialize(contentPath, photopeaEl, {
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
              key: contentPath,
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
            setIsLoading(false);
          }
        },
      });
    } catch (err) {
      console.error("failed to generate design", err);
      setError(err);
      setIsLoading(false);
    }
  };

  return {
    generateDesignForSchedule,
    isScheduleEmpty,
    isLoading,
    error,
  };
};
