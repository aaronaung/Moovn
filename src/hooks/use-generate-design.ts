import { Tables } from "@/types/db";
import { usePhotopeaHeadless } from "../contexts/photopea-headless";
import { supaClientComponentClient } from "../data/clients/browser";
import { BUCKETS } from "../consts/storage";
import { readPsd } from "ag-psd";
import { determineDesignGenSteps } from "../libs/designs/photoshop-v2";
import { db } from "../libs/indexeddb/indexeddb";
import { useState } from "react";
import { addHeadlessPhotopeaToDom } from "../libs/designs/photopea";
import { ScheduleData } from "../libs/sources";
import { isBefore, startOfToday } from "date-fns";
import { generateDesignHash } from "../libs/designs/util";
import { deconstructContentIdbKey, getRangeStart } from "../libs/content";

export const useGenerateDesign = () => {
  const [isScheduleEmpty, setIsScheduleEmpty] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);
  const { initialize } = usePhotopeaHeadless();

  const cleanupOldDesigns = async () => {
    const designs = await db.designs.toArray();
    for (const design of designs) {
      const { range } = deconstructContentIdbKey(design.key);
      const rangeStart = getRangeStart(range);
      if (isBefore(rangeStart, startOfToday())) {
        await db.designs.delete(design.key);
      }
    }
  };

  /**
   * @description generateDesignForSchedule temporarily adds a headless photopea iframe to the document body,
   * initializes it with a template, use the schedule data to determine what psd actions to take,
   * then sends photopea commands to manipulate the template loaded in the iframe. Once the design is generated,
   * it saves the design to indexeddb, and removes the iframe from the document body.
   */
  const generateDesignForSchedule = async ({
    contentIdbKey,
    template,
    schedule,
    forceRefresh = false,
    signedTemplateUrl,
  }: {
    contentIdbKey: string;
    template: Tables<"templates">;
    schedule: ScheduleData;
    forceRefresh?: boolean;
    signedTemplateUrl: string;
  }) => {
    try {
      setIsLoading(true);
      await cleanupOldDesigns();

      const designHash = generateDesignHash(template.id, schedule);
      const designInIndexedDb = await db.designs.get(contentIdbKey);

      if (!forceRefresh) {
        if (designInIndexedDb?.hash === designHash) {
          console.info(
            `schedule data hasn't changed for template ${template.id} - skipping design generation`,
          );
          setIsLoading(false);
          return;
        }
      }

      if (designInIndexedDb && designInIndexedDb.hash !== designHash) {
        // Schedule data has changed, delete the overwritten design.
        await db.designs.delete(contentIdbKey);
        await supaClientComponentClient.storage
          .from(BUCKETS.designOverwrites)
          .remove([`${contentIdbKey}.psd`, `${contentIdbKey}.jpg`]);
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
      initialize(contentIdbKey, photopeaEl, {
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
              key: contentIdbKey,
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
