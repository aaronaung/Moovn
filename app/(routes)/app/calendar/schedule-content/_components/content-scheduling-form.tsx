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
import { atScheduleExpression, renderCaption } from "@/src/libs/content";
import { useSupaMutation, useSupaQuery } from "@/src/hooks/use-supabase";
import { getScheduleDataForSourceByTimeRange } from "@/src/data/sources";
import { organizeScheduleDataByView } from "@/src/libs/sources/utils";
import { ScheduleContentRequest } from "@/app/api/content/schedule/route";
import { differenceInDays } from "date-fns";

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

  const {
    control,
    watch,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<ContentSchedulingFormSchema>({
    defaultValues: {
      source_id: availableSources?.[0].id || "",
      destination_id: availableDestinations?.[0].id || "",
      template_ids: availableTemplates?.[0].id ? [availableTemplates?.[0].id] : [],
      schedule_range: {
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
    if (scheduleRange.to && scheduleRange.from) {
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
  const { mutateAsync: _saveContent } = useSupaMutation(saveContent);
  const { mutateAsync: _saveContentSchedule } = useSupaMutation(saveContentSchedule);

  const scheduleContent = async (
    contentPath: string,
    ownerId: string,
    publishDateTime: Date,
  ): Promise<ScheduleContentRequest[0] | null> => {
    const design = await db.designs.get(contentPath);
    if (!design) {
      console.error(`Design ${contentPath} not found in indexedDB`);
      toast({
        variant: "destructive",
        title: `Design not found. Please contact support.`,
      });
      return null;
    }
    const template = availableTemplates.find((t) => t.id === design.templateId);
    if (!template) {
      console.error(`Template ${design.templateId} not found in available templates`);
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

    await upsertObjectAtPath({
      bucket: BUCKETS.scheduledContent,
      objectPath: contentPath,
      content: design.jpg,
      contentType: "image/jpeg",
      client: supaClientComponentClient,
    });

    const scheduleByRange = organizeScheduleDataByView(
      template.source_data_view,
      scheduleRange,
      scheduleData,
    );

    const scheduleExpression = atScheduleExpression(publishDateTime);
    const scheduleDataForRange = scheduleByRange[contentPath.split("/")[0]];

    const content = await _saveContent({
      source_id: sourceId,
      source_data_view: template.source_data_view,
      type: template.content_type,
      owner_id: ownerId,
      template_id: template.id,
      destination_id: destinationId,
      ig_tags: [design.instagramTags], // In a carousel post we'll have multiple tag groups ordered by the order they appear in..
      ...(template.ig_caption_template
        ? { ig_caption: renderCaption(template.ig_caption_template, scheduleDataForRange) }
        : {}),
      updated_at: new Date().toISOString(),
    });

    const scheduleName = contentPath.replaceAll("/", "_"); // AWS EventBridge doesn't allow slashes in rule names.
    await _saveContentSchedule({
      content_id: content.id,
      name: scheduleName,
      owner_id: ownerId,
      schedule_expression: scheduleExpression,
      updated_at: new Date().toISOString(),
    });

    return {
      contentId: content.id,
      contentPath,
      scheduleName,
      scheduleExpression,
    };
  };

  const handleScheduleForPublishing = async () => {
    if (availableTemplates.length === 0) {
      return;
    }

    try {
      setIsScheduling(true);
      let schedulePromises = [];
      let doneCount = 0;
      const schedules = [];
      while (doneCount < selectedContentItems.length) {
        if (schedulePromises.length === SCHEDULING_BATCH_SIZE) {
          schedules.push(...(await Promise.all(schedulePromises)));
          setSchedulingProgress((doneCount / selectedContentItems.length) * 100);
          schedulePromises = [];
        }

        const ownerId = availableTemplates[0].owner_id;
        const contentPath = selectedContentItems[doneCount];
        const publishDateTime = publishDateTimeMap[contentPath];
        schedulePromises.push(scheduleContent(contentPath, ownerId, publishDateTime));
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
    } catch (err) {
      console.error(err);
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
        <div className="block gap-x-4 md:flex">
          <InputSelect
            label="Schedule source"
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
          {/** TODO: DATE RANGE VALIDATOR NOT WORKING */}
          <InputDateRangePicker
            label="Schedule range"
            className="w-full md:w-[300px]"
            rhfKey="schedule_range"
            control={control}
            error={errors.schedule_range?.message}
            disablePastDays
          />
        </div>
        <div className="flex gap-x-3">
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
        {isLoadingScheduleData ? (
          <Spinner />
        ) : (
          <ContentList
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
