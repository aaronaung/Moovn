import { useState } from "react";
import { Tables } from "@/types/db";
import { toast } from "@/src/components/ui/use-toast";
import { db } from "@/src/libs/indexeddb/indexeddb";
import { supaClientComponentClient } from "@/src/data/clients/browser";
import {
  saveContent,
  saveContentSchedule,
  scheduleContent as upsertSchedulesOnEventBridge,
} from "@/src/data/content";
import {
  atScheduleExpression,
  deconstructContentIdbKey,
  getScheduleName,
  renderCaption,
} from "@/src/libs/content";
import { useSupaMutation } from "@/src/hooks/use-supabase";
import { organizeScheduleDataByView } from "@/src/libs/sources/utils";
import { ScheduleContentRequest } from "@/app/api/content/schedule/route";
import { generateDesignHash } from "@/src/libs/designs/util";
import { BUCKETS } from "../consts/storage";
import { upsertObjectAtPath } from "../libs/storage";

const SCHEDULING_BATCH_SIZE = 5;

export function useScheduleContent({
  sourceId,
  destinationId,
  availableTemplates,
  scheduleData,
}: {
  sourceId: string;
  destinationId: string;
  availableTemplates: Tables<"templates">[];
  scheduleData: any;
}) {
  const [isScheduling, setIsScheduling] = useState(false);

  const { mutateAsync: _saveContent } = useSupaMutation(saveContent);
  const { mutateAsync: _saveContentSchedule } = useSupaMutation(saveContentSchedule);

  const scheduleContentItem = async (
    contentIdbKey: string,
    publishDateTime: Date,
  ): Promise<ScheduleContentRequest[0] | null> => {
    const { templateId, range } = deconstructContentIdbKey(contentIdbKey);
    const designs = await db.designs.where("key").startsWith(contentIdbKey).toArray();
    if (designs.length === 0) {
      console.error(`No designs for content idb key ${contentIdbKey} found in indexedDB`);
      toast({
        variant: "destructive",
        title: `Designs not found. Please contact support.`,
      });
      return null;
    }
    const template = availableTemplates.find((t) => t.id === templateId);
    if (!template) {
      console.error(`Template ${templateId} not found in available templates`);
      toast({
        variant: "destructive",
        title: `Template not found. Please contact support.`,
      });
      return null;
    }
    if (!scheduleData) {
      console.error(`Schedule data not found for source ${sourceId}`);
      toast({
        variant: "destructive",
        title: `Schedule data not found. Please contact support.`,
      });
      return null;
    }
    const ownerId = template.owner_id;

    const scheduleByRange = organizeScheduleDataByView(
      template.source_data_view,
      { from: publishDateTime, to: publishDateTime },
      scheduleData,
    );
    const scheduleDataForRange = scheduleByRange[range];

    const scheduleExpression = atScheduleExpression(publishDateTime);

    const content = await _saveContent({
      source_id: sourceId,
      source_data_view: template.source_data_view,
      type: template.content_type,
      owner_id: ownerId,
      template_id: template.id,
      destination_id: destinationId,
      ig_tags: designs.map((d) => d.instagramTags),
      ...(template.ig_caption_template
        ? { ig_caption: renderCaption(template.ig_caption_template, scheduleDataForRange) }
        : {}),
      data_hash: generateDesignHash(template.id, scheduleDataForRange),
      updated_at: new Date().toISOString(),
    });

    const overwrittenDesigns: string[] = [];
    const { data: singleJpgOverwriteExists, error } = await supaClientComponentClient.storage
      .from(BUCKETS.designOverwrites)
      .exists(`${ownerId}/${contentIdbKey}.jpg`);
    if (error) {
      // Exists throw an error when it doesn't exist.
      console.error(error);
    }
    if (singleJpgOverwriteExists) {
      await supaClientComponentClient.storage
        .from(BUCKETS.designOverwrites)
        .copy(`${ownerId}/${contentIdbKey}.jpg`, `${ownerId}/${content.id}`, {
          destinationBucket: BUCKETS.scheduledContent,
        });
      overwrittenDesigns.push(contentIdbKey);
    } else {
      const { data: carouselOverwrite, error } = await supaClientComponentClient.storage
        .from(BUCKETS.designOverwrites)
        .list(contentIdbKey);
      if (error) {
        // Exists throw an error when it doesn't exist.
        console.error(error);
      }
      if (carouselOverwrite && carouselOverwrite.length > 0) {
        for (const overwrite of carouselOverwrite) {
          if (overwrite.name.endsWith(".jpg")) {
            const overwritePath = `${ownerId}/${contentIdbKey}/${overwrite.name}`;
            await supaClientComponentClient.storage
              .from(BUCKETS.designOverwrites)
              .copy(
                overwritePath,
                `${ownerId}/${content.id}/${overwrite.name.replaceAll(".jpg", "")}`,
                {
                  destinationBucket: BUCKETS.scheduledContent,
                },
              );
            overwrittenDesigns.push(overwritePath.replaceAll(".jpg", ""));
          }
        }
      }
    }

    // Upload the non-overwritten design(s) from indexedDB
    if (designs.length === 1) {
      if (overwrittenDesigns.indexOf(designs[0].key) === -1) {
        await upsertObjectAtPath({
          bucket: BUCKETS.scheduledContent,
          objectPath: `${ownerId}/${content.id}`,
          content: designs[0].jpg,
          contentType: "image/jpeg",
          client: supaClientComponentClient,
        });
      }
    } else {
      await Promise.all(
        designs
          .filter((d) => overwrittenDesigns.indexOf(d.key) === -1)
          .map((d) =>
            upsertObjectAtPath({
              bucket: BUCKETS.scheduledContent,
              objectPath: `${ownerId}/${content.id}/${d.key.split("/").pop()}`,
              content: d.jpg,
              contentType: "image/jpeg",
              client: supaClientComponentClient,
            }),
          ),
      );
    }

    const scheduleName = getScheduleName(range, content.id);
    await _saveContentSchedule({
      content_id: content.id,
      name: getScheduleName(range, content.id),
      owner_id: ownerId,
      schedule_expression: scheduleExpression,
      updated_at: new Date().toISOString(),
    });

    return {
      contentId: content.id,
      contentPath: `${ownerId}/${content.id}`,
      scheduleName,
      scheduleExpression,
    };
  };

  const scheduleContent = async (
    contentIdbKeys: string[],
    publishDateTimeMap: { [key: string]: Date },
  ) => {
    const schedules = [];
    setIsScheduling(true);
    let schedulePromises = [];
    let doneCount = 0;

    try {
      while (doneCount < contentIdbKeys.length) {
        if (schedulePromises.length === SCHEDULING_BATCH_SIZE) {
          schedules.push(...(await Promise.all(schedulePromises)));
          schedulePromises = [];
        }

        const contentIdbKey = contentIdbKeys[doneCount];
        const publishDateTime = publishDateTimeMap[contentIdbKey];
        schedulePromises.push(scheduleContentItem(contentIdbKey, publishDateTime));
        doneCount++;
      }

      if (schedulePromises.length > 0) {
        schedules.push(...(await Promise.all(schedulePromises)));
      }
      await upsertSchedulesOnEventBridge(schedules.filter(Boolean) as ScheduleContentRequest);
    } catch (err) {
      console.error(err);
      for (const schedule of schedules) {
        if (schedule) {
          await supaClientComponentClient.from("content").delete().eq("id", schedule.contentId);
          await supaClientComponentClient
            .from("content_schedules")
            .delete()
            .eq("name", schedule.scheduleName);
        }
      }
      throw err;
    } finally {
      setIsScheduling(false);
    }
  };

  return { scheduleContent, isScheduling };
}
