"use client";
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
import { toast } from "@/src/components/ui/use-toast";
import { isMobile } from "react-device-detect";
import { cn } from "@/src/utils";
import { useSupaQuery } from "@/src/hooks/use-supabase";
import { getScheduleDataForSourceByTimeRange } from "@/src/data/sources";
import { differenceInDays, format, isBefore, startOfToday } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { useScheduleContent } from "@/src/hooks/use-schedule-content";
import { useQueryClient } from "@tanstack/react-query";
import { SourceTypes } from "@/src/consts/sources";

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
  const [publishDateTimeMap, setPublishDateTimeMap] = useState<{
    [key: string]: { date: Date; error: string | undefined };
  }>({});
  const [captionMap, setCaptionMap] = useState<{ [key: string]: string }>({});

  const router = useRouter();
  const queryClient = useQueryClient();

  const queryParams = useSearchParams();
  const qSourceId = queryParams?.get("source_id");
  const qTemplateIds = queryParams?.get("template_ids")?.split(",").filter(Boolean);
  const qDestinationId = queryParams?.get("destination_id");
  const qScheduleRangeSplit = queryParams?.get("schedule_range")?.split("_");

  let qScheduleRange: { from: Date; to: Date } | undefined;
  if (qScheduleRangeSplit) {
    let qScheduleRangeFrom = new Date(
      formatInTimeZone(qScheduleRangeSplit[0] ?? new Date(), "UTC", "yyyy-MM-dd'T'HH:mm:ss"),
    );
    let qScheduleRangeTo = new Date(
      formatInTimeZone(
        qScheduleRangeSplit[1] ?? qScheduleRangeSplit[0] ?? new Date(),
        "UTC",
        "yyyy-MM-dd'T'HH:mm:ss",
      ),
    );
    if (isBefore(qScheduleRangeTo, qScheduleRangeFrom)) {
      [qScheduleRangeFrom, qScheduleRangeTo] = [qScheduleRangeTo, qScheduleRangeFrom];
    } else if (isBefore(qScheduleRangeFrom, startOfToday())) {
      qScheduleRangeFrom = startOfToday();
    } else if (isBefore(qScheduleRangeTo, startOfToday())) {
      qScheduleRangeTo = startOfToday();
    }
    qScheduleRange = {
      from: qScheduleRangeFrom,
      to: qScheduleRangeTo,
    };
  }

  const {
    control,
    watch,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<ContentSchedulingFormSchema>({
    defaultValues: {
      source_id: qSourceId || availableSources?.[0]?.id || "",
      destination_id: qDestinationId || availableDestinations?.[0]?.id || "",
      template_ids:
        (qTemplateIds ?? []).length > 0
          ? qTemplateIds
          : availableTemplates?.[0]?.id
          ? [availableTemplates?.[0]?.id]
          : [],
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
    const urlParams = new URLSearchParams(queryParams ?? {});
    urlParams.set("source_id", sourceId);
    urlParams.set("template_ids", templateIds.join(","));
    urlParams.set("destination_id", destinationId);
    urlParams.set(
      "schedule_range",
      `${format(scheduleRange?.from ?? new Date(), "yyyy-MM-dd")}_${format(
        scheduleRange?.to ?? new Date(),
        "yyyy-MM-dd",
      )}`,
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
  console.log({ scheduleData });

  const { scheduleContents: scheduleContent, isScheduling } = useScheduleContent({
    sourceId,
    destinationId,
    availableTemplates,
  });

  const handleScheduleForPublishing = async () => {
    if (availableTemplates.length === 0) {
      return;
    }

    try {
      await scheduleContent(selectedContentItems, publishDateTimeMap, captionMap);
      toast({
        variant: "success",
        title: "Content scheduled successfully",
      });
      setSelectedContentItems([]);
      setPublishDateTimeMap({});
      queryClient.invalidateQueries({ queryKey: ["getAllContents"] });
      queryClient.invalidateQueries({ queryKey: ["getContentSchedules"] });
      router.push("/app/calendar");
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Failed to schedule content",
        description: "Please try again or contact support.",
      });
    }
  };

  if (isScheduling) {
    return (
      <div className="flex h-[400px] w-full flex-col items-center justify-center rounded-lg bg-secondary opacity-80">
        <p className="mb-2 font-semibold">Scheduling content...</p>
        <Spinner />
      </div>
    );
  }

  const hasDateTimeError = Object.values(publishDateTimeMap).some((dateTime) => dateTime.error);

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
            disabled={selectedContentItems.length === 0 || isScheduling || hasDateTimeError}
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
            options={availableSources
              .filter((source) => source.type !== SourceTypes.GoogleDrive)
              .map((source) => ({
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
          />
        </div>
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

        {templateIds.length > 0 && (
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
        )}

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
            captionMap={captionMap}
            setCaptionMap={setCaptionMap}
          />
        )}
      </form>
    </div>
  );
}
