import { Tables } from "@/types/db";
import { usePhotopeaHeadless } from "../contexts/photopea-headless";
import { getScheduleDataForSource } from "../data/sources";
import { SourceDataView } from "../consts/sources";
import { supaClientComponentClient } from "../data/clients/browser";
import { signUrl } from "../libs/storage";
import { BUCKETS } from "../consts/storage";
import { readPsd } from "ag-psd";
import { determinePSDActions } from "../libs/designs/photoshop-v2";
import { transformScheduleV2 } from "../libs/sources/utils";
import { exportCmd, moveLayerCmd, updateLayersCmd } from "../libs/designs/photopea";
import { db } from "../libs/indexeddb/indexeddb";
import { MD5 as hash } from "object-hash";
import { useState } from "react";

export const useGenerateDesign = () => {
  const [isScheduleEmpty, setIsScheduleEmpty] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);
  const { initialize, sendRawPhotopeaCmd } = usePhotopeaHeadless();

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
    template: Tables<"templates"> & { source: Tables<"sources"> | null },
    forceRefresh: boolean = false,
  ) => {
    try {
      setIsLoading(true);
      const [schedule, signedTemplateUrl] = await Promise.all([
        getScheduleDataForSource({
          id: template.source_id,
          view: template.source_data_view as SourceDataView,
        }),
        signUrl({
          bucket: BUCKETS.templates,
          objectPath: `${template.owner_id}/${template.id}.psd`,
          client: supaClientComponentClient,
        }),
      ]);
      if (schedule.schedules.length === 0) {
        setIsScheduleEmpty(true);
        return;
      }

      const designHash = hash({
        templateId: template.id,
        schedule,
      });
      if (!forceRefresh) {
        const design = await db.designs.get(template.id);
        if (design?.hash === designHash) {
          console.info(`schedule data hasn't changed for template ${template.id} - skipping design generation`);
          return;
        }
      }

      const templateFile = await (await fetch(signedTemplateUrl)).blob();
      const psd = readPsd(await templateFile.arrayBuffer());
      const psdActions = determinePSDActions(transformScheduleV2(schedule), psd);

      const iframeSrc = `https://www.photopea.com#${JSON.stringify({ files: [signedTemplateUrl], environment: {} })}`;
      const iframeEle = document.createElement("iframe");
      iframeEle.src = iframeSrc;
      iframeEle.className = "hidden";
      document.body.appendChild(iframeEle);

      initialize(template.id, {
        photopeaEl: iframeEle,
        onLayerCountChange: () => {
          for (const { from, to } of psdActions.translates) {
            sendRawPhotopeaCmd(template.id, iframeEle, moveLayerCmd({ from, to }));
          }
          sendRawPhotopeaCmd(template.id, iframeEle, exportCmd(template.id));
        },
        onFileExport: async (fileExport) => {
          if (fileExport?.["psd"] && fileExport?.["jpg"]) {
            db.designs.put({
              templateId: template.id,
              jpg: fileExport["jpg"],
              psd: fileExport["psd"],
              hash: designHash,
            });
          }
        },
        onReady: async () => {
          sendRawPhotopeaCmd(template.id, iframeEle, updateLayersCmd(psdActions.edits));
          if (psdActions.translates.length === 0) {
            sendRawPhotopeaCmd(template.id, iframeEle, exportCmd(template.id));
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
    generateDesign,
    isScheduleEmpty,
    isLoading,
    error,
  };
};
