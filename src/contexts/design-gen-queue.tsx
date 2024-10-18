"use client";
import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { ScheduleData } from "../libs/sources";
import { db } from "../libs/indexeddb/indexeddb";
import { getRangeStart, deconstructContentItemIdbKey } from "../libs/content";
import { isBefore, startOfYesterday } from "date-fns";
import { generateDesignHash } from "../libs/designs/util";
import { readPsd } from "ag-psd";
import { determineDesignGenSteps } from "../libs/designs/photoshop-v2";
import { addHeadlessPhotopeaToDom } from "../libs/designs/photopea/utils";
import { usePhotopeaHeadless } from "./photopea-headless";
import { deleteObject, signUrl } from "../data/r2";
import { useSearchParams } from "next/navigation";
import { Tables } from "@/types/db";
import { isMobile } from "react-device-detect";
import { ContentItemType } from "../consts/content";

type DesignJob = {
  idbKey: string; // Unique IndexedDB key where the design is stored.
  contentIdbKey: string; // Unique IndexedDB key of the content the design content item belongs to.
  template: Tables<"templates">;
  templateItem: Tables<"template_items">;
  schedule: ScheduleData;
  forceRefresh?: boolean;
  onTimeout?: () => void;
};

type DesignGenQueueContextType = {
  addJob: (job: DesignJob) => void;
  removeJob: (idbKey: string) => void;
  activeJobs: DesignJob[];
  queuedJobs: DesignJob[];
  isJobPending: (idbKey: string) => boolean;
};

const MAX_JOBS_IN_PROGRESS = isMobile ? 2 : 5;
const MAX_DESIGNS_IN_IDB = 50;

const DesignGenQueueContext = createContext<DesignGenQueueContextType | null>(null);

export const DesignGenQueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { initialize } = usePhotopeaHeadless();
  const searchParams = useSearchParams();

  const [activeJobs, setActiveJobs] = useState<DesignJob[]>([]);
  const [queuedJobs, setQueuedJobs] = useState<DesignJob[]>([]);

  const addJob = useCallback((job: DesignJob) => {
    setQueuedJobs((prevJobs) => [...prevJobs, job]);
  }, []);

  const removeJob = useCallback((idbKey: string) => {
    setActiveJobs((prevJobs) => prevJobs.filter((job) => job.idbKey !== idbKey));
    setQueuedJobs((prevJobs) => prevJobs.filter((job) => job.idbKey !== idbKey));
  }, []);

  const cleanupIdb = async () => {
    let contentItems = await db.contentItems.toArray();
    const oldContentItems = [];
    for (const item of contentItems) {
      const { range } = deconstructContentItemIdbKey(item.key);
      const rangeStart = getRangeStart(range);
      if (isBefore(rangeStart, startOfYesterday())) {
        oldContentItems.push(item);
      }
    }
    await Promise.all(oldContentItems.map((d) => db.contentItems.delete(d.key)));

    contentItems = await db.contentItems.toArray();
    contentItems.sort((a, b) => {
      const { range: aRange } = deconstructContentItemIdbKey(a.key);
      const { range: bRange } = deconstructContentItemIdbKey(b.key);
      return getRangeStart(aRange).getTime() - getRangeStart(bRange).getTime();
    });
    if (contentItems.length > MAX_DESIGNS_IN_IDB) {
      const contentItemsToDelete = contentItems.slice(0, contentItems.length - MAX_DESIGNS_IN_IDB);
      await Promise.all(contentItemsToDelete.map((d) => db.contentItems.delete(d.key)));
    }
  };

  const isJobInProgress = (idbKey: string) => {
    return activeJobs.some((job) => job.idbKey.startsWith(idbKey));
  };
  const isJobWaitingInQueue = (idbKey: string) => {
    return queuedJobs.some((job) => job.idbKey.startsWith(idbKey));
  };
  const isJobPending = (idbKey: string) => isJobInProgress(idbKey) || isJobWaitingInQueue(idbKey);

  useEffect(() => {
    const processQueue = async () => {
      if (activeJobs.length < MAX_JOBS_IN_PROGRESS && queuedJobs.length > 0) {
        const [nextJob, ...remainingJobs] = queuedJobs;
        setActiveJobs((prevJobs) => [...prevJobs, nextJob]);
        setQueuedJobs(remainingJobs);

        const { contentIdbKey, template, templateItem, idbKey, schedule, forceRefresh } = nextJob;
        try {
          await cleanupIdb();
          const debug = searchParams?.get("debug") === "true";

          const designHash = generateDesignHash(templateItem.id, schedule);
          const designInIdb = await db.contentItems.get(idbKey);

          if (!forceRefresh && designInIdb?.hash === designHash) {
            console.info(
              `schedule data hasn't changed for template ${template.id} - skipping design generation`,
            );
            removeJob(nextJob.idbKey);
            return;
          }

          if (designInIdb && designInIdb.hash !== designHash) {
            // Schedule data has changed, delete the overwritten design.
            await db.contentItems.delete(idbKey);
            await Promise.all([
              deleteObject("design-overwrites", `${template.owner_id}/${idbKey}.psd`),
              deleteObject("design-overwrites", `${template.owner_id}/${idbKey}.jpg`),
            ]);
          }

          const idbTemplateItem = await db.templateItems.get(templateItem.id);
          let templateFile = idbTemplateItem?.psd;
          if (!templateFile) {
            const templateUrl = await signUrl(
              "templates",
              `${template.owner_id}/${template.id}/${templateItem.id}.psd`,
            );
            templateFile = await (await fetch(templateUrl)).arrayBuffer();
          }
          const templatePsd = readPsd(templateFile);

          const designGenSteps = await determineDesignGenSteps(schedule, templatePsd);

          const photopeaEl = addHeadlessPhotopeaToDom(debug);
          const start = performance.now();
          initialize(idbKey, photopeaEl, {
            initialData: templateFile,
            designGenSteps,
            onTimeout: () => {
              if (document.body.contains(photopeaEl) && !debug) {
                document.body.removeChild(photopeaEl);
              }
              nextJob.onTimeout?.();
              removeJob(nextJob.idbKey);
            },
            onDesignExport: async (designExport) => {
              if (designExport?.["psd"] && designExport?.["jpg"]) {
                await db.contentItems.put({
                  key: idbKey,
                  content_idb_key: contentIdbKey,
                  template_id: template.id,
                  template_item_id: templateItem.id,
                  jpg: designExport["jpg"],
                  psd: designExport["psd"],
                  hash: designHash,
                  type: templateItem.type as ContentItemType,
                  position: templateItem.position,
                  metadata: {
                    ig_tags: designExport.instagramTags ?? [],
                  },
                  updated_at: new Date(),
                  created_at: new Date(),
                });
                const end = performance.now();
                console.log(`design generation took: ${idbKey} ${end - start}ms`);
                if (document.body.contains(photopeaEl) && !debug) {
                  document.body.removeChild(photopeaEl);
                }
              }
              removeJob(nextJob.idbKey);
            },
          });
        } catch (err) {
          console.error("failed to generate design", err);
          removeJob(nextJob.idbKey);
        }
      }
    };

    processQueue();
  }, [activeJobs, queuedJobs, removeJob]);

  return (
    <DesignGenQueueContext.Provider
      value={{ addJob, removeJob, activeJobs, queuedJobs, isJobPending }}
    >
      {children}
    </DesignGenQueueContext.Provider>
  );
};

export const useDesignGenQueue = () => {
  const context = useContext(DesignGenQueueContext);
  if (!context) {
    throw new Error("useDesignGenQueue must be used within a DesignGenQueueProvider");
  }
  return context;
};
