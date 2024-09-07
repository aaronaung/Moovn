"use client";
import { Tables } from "@/types/db";
import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { ScheduleData } from "../libs/sources";
import { db } from "../libs/indexeddb/indexeddb";
import { deconstructContentIdbKey, getRangeStart } from "../libs/content";
import { isBefore, startOfToday } from "date-fns";
import { generateDesignHash } from "../libs/designs/util";
import { supaClientComponentClient } from "../data/clients/browser";
import { BUCKETS } from "../consts/storage";
import { readPsd } from "ag-psd";
import { determineDesignGenSteps } from "../libs/designs/photoshop-v2";
import { addHeadlessPhotopeaToDom } from "../libs/designs/photopea/utils";
import { usePhotopeaHeadless } from "./photopea-headless";

type DesignJob = {
  idbKey: string; // Unique IndexedDB key where the design is stored.
  template: Tables<"templates">;
  templateUrl: string;
  schedule: ScheduleData;
  forceRefresh?: boolean;
  debug?: boolean;
};

type DesignGenQueueContextType = {
  addJob: (job: DesignJob) => void;
  removeJob: (idbKey: string) => void;
  activeJobs: DesignJob[];
  queuedJobs: DesignJob[];
  isJobPending: (idbKey: string) => boolean;
};

const MAX_JOBS_IN_PROGRESS = 5;
const MAX_DESIGNS_IN_IDB = 50;

const DesignGenQueueContext = createContext<DesignGenQueueContextType | null>(null);

export const DesignGenQueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { initialize } = usePhotopeaHeadless();

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
    let designs = await db.designs.toArray();
    const oldDesigns = [];
    for (const design of designs) {
      const { range } = deconstructContentIdbKey(design.key);
      const rangeStart = getRangeStart(range);
      if (isBefore(rangeStart, startOfToday())) {
        oldDesigns.push(design);
      }
    }
    await Promise.all(oldDesigns.map((d) => db.designs.delete(d.key)));

    designs = await db.designs.toArray();
    designs.sort((a, b) => {
      const { range: aRange } = deconstructContentIdbKey(a.key);
      const { range: bRange } = deconstructContentIdbKey(b.key);
      return getRangeStart(aRange).getTime() - getRangeStart(bRange).getTime();
    });
    if (designs.length > 50) {
      const designsToDelete = designs.slice(0, designs.length - MAX_DESIGNS_IN_IDB);
      await Promise.all(designsToDelete.map((d) => db.designs.delete(d.key)));
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

        console.log("processing design gen job", nextJob.idbKey);

        const { template, templateUrl, idbKey, schedule, forceRefresh } = nextJob;
        try {
          await cleanupIdb();

          const designHash = generateDesignHash(template.id, schedule);
          const designInIdb = await db.designs.get(idbKey);

          if (!forceRefresh && designInIdb?.hash === designHash) {
            console.info(
              `schedule data hasn't changed for template ${template.id} - skipping design generation`,
            );
            removeJob(nextJob.idbKey);
            return;
          }

          if (designInIdb && designInIdb.hash !== designHash) {
            // Schedule data has changed, delete the overwritten design.
            await db.designs.delete(idbKey);
            await supaClientComponentClient.storage
              .from(BUCKETS.designOverwrites)
              .remove([`${template.owner_id}/${idbKey}.psd`, `${template.owner_id}/${idbKey}.jpg`]);
          }

          const templateFile = await (await fetch(templateUrl)).arrayBuffer();
          const psd = readPsd(templateFile);
          const designGenSteps = await determineDesignGenSteps(schedule, psd);

          const photopeaEl = addHeadlessPhotopeaToDom(nextJob.debug);
          initialize(idbKey, photopeaEl, {
            initialData: templateFile,
            designGenSteps,
            onTimeout: () => {
              if (document.body.contains(photopeaEl) && !nextJob.debug) {
                document.body.removeChild(photopeaEl);
              }
              removeJob(nextJob.idbKey);
            },
            onDesignExport: async (designExport) => {
              if (designExport?.["psd"] && designExport?.["jpg"]) {
                await db.designs.put({
                  key: idbKey,
                  templateId: template.id,
                  jpg: designExport["jpg"],
                  psd: designExport["psd"],
                  hash: designHash,
                  instagramTags: designExport.instagramTags,
                  lastUpdated: new Date(),
                });
                if (document.body.contains(photopeaEl) && !nextJob.debug) {
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
