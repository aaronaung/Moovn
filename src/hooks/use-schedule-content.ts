import { useState } from "react";
import { Tables } from "@/types/db";
import { toast } from "@/src/components/ui/use-toast";
import { db } from "@/src/libs/indexeddb/indexeddb";
import { supaClientComponentClient } from "@/src/data/clients/browser";
import {
  saveContent,
  saveContentItem,
  saveContentSchedule,
  scheduleContent as upsertSchedulesOnEventBridge,
} from "@/src/data/content";
import {
  atScheduleExpression,
  deconstructContentIdbKey,
  getScheduleName,
} from "@/src/libs/content";
import { useSupaMutation } from "@/src/hooks/use-supabase";
import { ScheduleContentRequest } from "@/app/api/content/schedule/route";
import { copyObject, objectExists, uploadObject } from "../data/r2";
import { IgContentItemMetadata, IgContentMetadata } from "../consts/content";

const SCHEDULING_BATCH_SIZE = 5;

export function useScheduleContent({
  sourceId,
  destinationId,
  availableTemplates,
}: {
  sourceId: string;
  destinationId: string;
  availableTemplates: Tables<"templates">[];
}) {
  const [isScheduling, setIsScheduling] = useState(false);

  const { mutateAsync: _saveContent } = useSupaMutation(saveContent);
  const { mutateAsync: _saveContentItem } = useSupaMutation(saveContentItem);
  const { mutateAsync: _saveContentSchedule } = useSupaMutation(saveContentSchedule);

  const scheduleContent = async (
    contentIdbKey: string,
    publishDateTime: { date: Date; error: string | undefined },
    caption: string,
  ): Promise<ScheduleContentRequest[0] | null> => {
    if (publishDateTime.error) {
      return null;
    }

    const { templateId, range } = deconstructContentIdbKey(contentIdbKey);
    const contentItems = await db.contentItems
      .where("content_idb_key")
      .equals(contentIdbKey)
      .toArray();
    if (contentItems.length === 0) {
      console.error(`No content items for content idb key ${contentIdbKey} found in indexedDB`);
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
    const ownerId = template.owner_id;

    const scheduleExpression = atScheduleExpression(publishDateTime.date);

    const content = await _saveContent({
      source_id: sourceId,
      source_data_view: template.source_data_view,
      type: template.content_type,
      owner_id: ownerId,
      template_id: template.id,
      destination_id: destinationId,
      metadata: {
        ...(template.ig_caption_template ? { ig_caption: caption } : {}),
      } as IgContentMetadata,
      data_hash: contentItems[0].hash, //the hash is the same for all designs in the carousel
    });

    for (const item of contentItems) {
      const savedItem = await _saveContentItem({
        content_id: content.id,
        hash: item.hash,
        metadata: {
          ig_tags: item.metadata?.ig_tags ?? [],
        } as IgContentItemMetadata,
        position: item.position,
        template_item_id: item.template_item_id,
        type: item.type,
      });

      const overwriteExists = await objectExists("design-overwrites", `${ownerId}/${item.key}.jpg`);
      if (overwriteExists) {
        await copyObject(
          "design-overwrites",
          `${ownerId}/${item.key}.jpg`,
          "scheduled-content",
          `${ownerId}/${content.id}/${savedItem.id}`,
        );
      } else {
        if (!item.jpg) {
          console.error(`No jpg for content item ${item.key} in idb`);
          continue;
        }
        await uploadObject(
          "scheduled-content",
          `${ownerId}/${content.id}/${savedItem.id}`,
          new Blob([item.jpg]),
        );
      }
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

  const scheduleContents = async (
    contentIdbKeys: string[],
    publishDateTimeMap: { [key: string]: { date: Date; error: string | undefined } },
    captionMap: { [key: string]: string },
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
        const caption = captionMap[contentIdbKey];
        schedulePromises.push(scheduleContent(contentIdbKey, publishDateTime, caption));
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

  return { scheduleContents, isScheduling };
}
