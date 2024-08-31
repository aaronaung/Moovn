import { Tables } from "@/types/db";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import InputSelect from "../../../../../../src/components/ui/input/select";
import InputDateRangePicker from "../../../../../../src/components/ui/input/date-range-picker";
import { CONTENT_TYPES_BY_DESTINATION_TYPE } from "@/src/consts/content";
import ContentList from "./content-list";
import InputMultiSelect from "@/src/components/ui/input/multi-select";
import { useEffect, useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Spinner } from "@/src/components/common/loading-spinner";
import { Progress } from "@/src/components/ui/progress";
import { toast } from "@/src/components/ui/use-toast";
import { db } from "@/src/libs/indexeddb/indexeddb";
import { upsertObjectAtPath } from "@/src/libs/storage";
import { BUCKETS } from "@/src/consts/storage";
import { supaClientComponentClient } from "@/src/data/clients/browser";
import { isMobile } from "react-device-detect";
import { cn } from "@/src/utils";
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
import { useSupaMutation, useSupaQuery } from "@/src/hooks/use-supabase";
import { getScheduleDataForSourceByTimeRange } from "@/src/data/sources";
import { organizeScheduleDataByView } from "@/src/libs/sources/utils";
import { ScheduleContentRequest } from "@/app/api/content/schedule/route";
import { differenceInDays } from "date-fns";
import { generateDesignHash } from "@/src/libs/designs/util";
import { useRouter, useSearchParams } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";

const formSchema = z.object({
  source_id: z.string(),
  template_ids: z.array(z.string()),
  destination_id: z.string(),
  schedule_range: z.object({
    from: z.coerce.date(),
    to: z.coerce.date(),
  }),
});

export type ContentSchedulingFormSchema = z.infer<typeof formSchema>;

const SCHEDULING_BATCH_SIZE = 5;
export default function ContentSchedulingForm({
  availableSources,
  availableDestinations,
  availableTemplates,
}: {
  availableSources: Tables<"sources">[];
  availableTemplates: Tables<"templates">[];
  availableDestinations: Tables<"destinations">[];
}) {
  const [selectedContentItems, setSelectedContentItems] = useState<string[]>([]);
  const [publishDateTimeMap, setPublishDateTimeMap] = useState<{ [key: string]: Date }>({});
  const [isScheduling, setIsScheduling] = useState(false);
  const [schedulingProgress, setSchedulingProgress] = useState(0);
  const router = useRouter();

  const queryParams = useSearchParams();
  const qSourceId = queryParams.get("source_id");
  const qTemplateIds = queryParams.get("template_ids")?.split(",");
  const qDestinationId = queryParams.get("destination_id");
  const qScheduleRangeSplit = queryParams.get("schedule_range")?.split("_");
  const qScheduleRange = qScheduleRangeSplit
    ? {
        from: new Date(
          formatInTimeZone(qScheduleRangeSplit[0] ?? new Date(), "UTC", "yyyy-MM-dd'T'HH:mm:ss"),
        ),
        to: new Date(
          formatInTimeZone(
            qScheduleRangeSplit[1] ?? qScheduleRangeSplit[0] ?? new Date(),
            "UTC",
            "yyyy-MM-dd'T'HH:mm:ss",
          ),
        ),
      }
    : undefined;

  const {
    control,
    watch,
    setError,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<ContentSchedulingFormSchema>({
    defaultValues: {
      source_id: qSourceId || availableSources?.[0].id || "",
      destination_id: qDestinationId || availableDestinations?.[0].id || "",
      template_ids: qTemplateIds || availableTemplates?.[0].id ? [availableTemplates?.[0].id] : [],
      schedule_range: qScheduleRange ?? {
        from: new Date(),
        to: new Date(),
      },
    },
    resolver: zodResolver(formSchema),
  });

  const sourceId = watch("source_id");
  const templateIds = watch("template_ids");
  const destinationId = watch("destination_id");
  const scheduleRange = watch("schedule_range");

  useEffect(() => {
    // On change of source, update the query params
    const urlParams = new URLSearchParams();
    urlParams.set("source_id", sourceId);
    urlParams.set("template_ids", templateIds.join(","));
    urlParams.set("destination_id", destinationId);
    urlParams.set(
      "schedule_range",
      `${(scheduleRange?.from ?? new Date()).toISOString().split("T")[0]}_${
        (scheduleRange?.to ?? scheduleRange?.from ?? new Date()).toISOString().split("T")[0]
      }`,
    );
    router.replace(`${window.location.pathname}?${urlParams.toString()}`);
  }, [sourceId, templateIds, destinationId, scheduleRange]);

  useEffect(() => {
    if (scheduleRange?.to && scheduleRange?.from) {
      const diffInDays = differenceInDays(scheduleRange.to, scheduleRange.from);
      if (diffInDays > 31) {
        setError("schedule_range", {
          message: "Schedule range cannot be more than 31 days",
        });
      } else {
        clearErrors("schedule_range");
      }
    }
  }, [scheduleRange]);

  const allowedDestinations = availableDestinations.filter((destination) => {
    return CONTENT_TYPES_BY_DESTINATION_TYPE[destination.type].includes(
      availableTemplates.find((t) => templateIds.includes(t.id))?.content_type || "",
    );
  });

  const { data: scheduleData, isLoading: isLoadingScheduleData } = useSupaQuery(
    getScheduleDataForSourceByTimeRange,
    {
      queryKey: ["getScheduleDataForSourceByTimeRange", sourceId, scheduleRange],
      arg: {
        id: sourceId,
        dateRange: scheduleRange,
      },
      enabled: !errors.schedule_range,
    },
  );
  const { mutateAsync: _saveContent } = useSupaMutation(saveContent, {
    invalidate: [["getContentsForAuthUser"]],
  });
  const { mutateAsync: _saveContentSchedule } = useSupaMutation(saveContentSchedule);

  const scheduleContent = async (
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
      scheduleRange,
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
      ig_tags: designs.map((d) => d.instagramTags), // In a carousel post we'll have multiple tag groups ordered by the order they appear in..
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

  const handleScheduleForPublishing = async () => {
    if (availableTemplates.length === 0) {
      return;
    }

    const schedules = [];
    try {
      setIsScheduling(true);
      let schedulePromises = [];
      let doneCount = 0;

      while (doneCount < selectedContentItems.length) {
        if (schedulePromises.length === SCHEDULING_BATCH_SIZE) {
          schedules.push(...(await Promise.all(schedulePromises)));
          setSchedulingProgress((doneCount / selectedContentItems.length) * 100);
          schedulePromises = [];
        }

        const contentIdbKey = selectedContentItems[doneCount];
        const publishDateTime = publishDateTimeMap[contentIdbKey];
        schedulePromises.push(scheduleContent(contentIdbKey, publishDateTime));
        doneCount++;
      }

      if (schedulePromises.length > 0) {
        schedules.push(...(await Promise.all(schedulePromises)));
      }
      await upsertSchedulesOnEventBridge(schedules.filter(Boolean) as ScheduleContentRequest);
      toast({
        variant: "success",
        title: "Content scheduled successfully",
      });
      setSelectedContentItems([]);
      setPublishDateTimeMap({});
      router.push("/app/calendar");
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
      toast({
        variant: "destructive",
        title: "Failed to schedule content",
        description: "Please try again or contact support.",
      });
    } finally {
      setIsScheduling(false);
    }
  };

  if (isScheduling) {
    return (
      <div className="flex h-[400px] w-full flex-col items-center justify-center rounded-lg bg-secondary opacity-80">
        <p className="mb-2 font-semibold">Scheduling content...</p>
        <Progress value={schedulingProgress} className="w-[60%] bg-black fill-white" />
      </div>
    );
  }

  return (
    <div>
      <div
        className={cn(
          "fixed right-4 z-10 rounded-lg p-2 md:right-8 md:top-6 md:p-3",
          isMobile && "bottom-4",
          selectedContentItems.length > 0 && "bg-secondary",
        )}
      >
        <div className="flex items-center gap-1 self-end">
          {selectedContentItems.length > 0 && (
            <p className="flex h-12 items-center px-4 text-sm text-secondary-foreground">
              {selectedContentItems.length} selected
            </p>
          )}
          <Button
            onClick={handleScheduleForPublishing}
            disabled={selectedContentItems.length === 0 || isScheduling}
            className="h-12"
          >
            {isScheduling ? <Spinner className="text-secondary" /> : "Schedule for publishing"}
          </Button>
        </div>
      </div>

      <form
        className="flex flex-col gap-y-3"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <div className="flex flex-col gap-x-4 gap-y-3 md:flex-row">
          <InputSelect
            label="Source"
            className="w-full md:w-[300px]"
            rhfKey={"source_id"}
            options={availableSources.map((source) => ({
              value: source.id,
              label: source.name,
            }))}
            control={control}
            error={errors.source_id?.message}
            inputProps={{
              placeholder: "Select a schedule source",
            }}
          />
          <InputDateRangePicker
            label="Schedule range"
            className="w-full md:w-[300px]"
            rhfKey="schedule_range"
            control={control}
            error={errors.schedule_range?.message}
            disablePastDays
          />
        </div>
        <InputSelect
          label="Destination"
          className="md:w-[620px]"
          rhfKey={"destination_id"}
          options={allowedDestinations.map((destination) => ({
            value: destination.id,
            label: destination.name,
          }))}
          control={control}
          error={errors.destination_id?.message}
          inputProps={{
            placeholder: "Select a destination",
          }}
        />
        <InputMultiSelect
          label="Templates"
          rhfKey={"template_ids"}
          className="w-full md:w-[620px]"
          options={availableTemplates.map((template) => ({
            value: template.id,
            label: template.name,
          }))}
          control={control}
          error={errors.template_ids?.message}
          inputProps={{
            placeholder: "Select one or more templates",
          }}
        />

        {isLoadingScheduleData ? (
          <Spinner />
        ) : (
          <ContentList
            sourceId={sourceId}
            templateIds={templateIds}
            scheduleRange={{
              from: scheduleRange?.from ?? new Date(),
              to: scheduleRange?.to ?? new Date(),
            }}
            scheduleData={scheduleData ?? {}}
            selectedContentItems={selectedContentItems}
            setSelectedContentItems={setSelectedContentItems}
            publishDateTimeMap={publishDateTimeMap}
            setPublishDateTimeMap={setPublishDateTimeMap}
          />
        )}
      </form>
    </div>
  );
}
