import { Tables } from "@/types/db";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import InputSelect from "../../../../../../src/components/ui/input/select";
import InputDateRangePicker from "../../../../../../src/components/ui/input/date-range-picker";
import { CONTENT_TYPES_BY_DESTINATION_TYPE } from "@/src/consts/content";
import ContentList from "./content-list";
import InputMultiSelect from "@/src/components/ui/input/multi-select";
import { useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Spinner } from "@/src/components/common/loading-spinner";
import { Progress } from "@/src/components/ui/progress";
import { toast } from "@/src/components/ui/use-toast";
import { db } from "@/src/libs/indexeddb/indexeddb";
import { signUploadUrl } from "@/src/libs/storage";
import { BUCKETS } from "@/src/consts/storage";
import { supaClientComponentClient } from "@/src/data/clients/browser";
import { isMobile } from "react-device-detect";
import { cn } from "@/src/utils";
import { scheduleContent as upsertSchedulesOnEventBridge } from "@/src/data/content";
import { atScheduleExpression } from "@/src/libs/content";

const formSchema = z.object({
  source_id: z.string(),
  template_ids: z.array(z.string()),
  destination_id: z.string(),
  schedule_range: z
    .object({
      from: z.date(),
      to: z.date(),
    })
    .refine(
      (data) => {
        const diffInMonths =
          (data.to.getFullYear() - data.from.getFullYear()) * 12 +
          data.to.getMonth() -
          data.from.getMonth();
        return diffInMonths <= 1;
      },
      {
        message: "Schedule range cannot exceed 1 month",
      },
    ),
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
  const scheduleRange = watch("schedule_range");

  const allowedDestinations = availableDestinations.filter((destination) => {
    return CONTENT_TYPES_BY_DESTINATION_TYPE[destination.type].includes(
      availableTemplates.find((t) => templateIds.includes(t.id))?.content_type || "",
    );
  });

  const scheduleContent = async (
    contentKey: string,
    ownerId: string,
    publishDateTime: Date,
    content: ArrayBuffer,
    contentType: string,
  ) => {
    let objectPath = `${ownerId}/${contentKey}.jpeg`;

    await supaClientComponentClient.storage.from(BUCKETS.scheduledContent).remove([objectPath]);
    const { token } = await signUploadUrl({
      bucket: BUCKETS.scheduledContent,
      objectPath,
      client: supaClientComponentClient,
    });
    await supaClientComponentClient.storage
      .from(BUCKETS.scheduledContent)
      .uploadToSignedUrl(objectPath, token, content, {
        contentType,
      });

    await supaClientComponentClient.from("content_schedules").upsert(
      {
        name: contentKey,
        owner_id: ownerId,
        schedule_expression: atScheduleExpression(publishDateTime),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "name",
      },
    );
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
          await Promise.all(schedulePromises);
          setSchedulingProgress((doneCount / selectedContentItems.length) * 100);
          schedulePromises = [];
        }

        const ownerId = availableTemplates[0].owner_id;
        const contentKey = selectedContentItems[doneCount];
        const publishDateTime = publishDateTimeMap[contentKey];
        const design = await db.designs.get(contentKey);
        if (!design?.jpg) {
          console.error(`Design ${contentKey} not found in indexedDB`);
          toast({
            variant: "destructive",
            title: `Design not found. Please contact support.`,
          });
          return;
        }
        schedulePromises.push(
          scheduleContent(contentKey, ownerId, publishDateTime, design.jpg, "image/jpeg"),
        );
        schedules.push({
          contentKey: contentKey.replaceAll("/", "_"), // replace / with _ to comply with eventbridge naming restrictions.
          scheduleExpression: atScheduleExpression(publishDateTime),
        });
        doneCount++;
      }

      if (schedulePromises.length > 0) {
        await Promise.all(schedulePromises);
      }
      await upsertSchedulesOnEventBridge(schedules);
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

        <ContentList
          sourceId={sourceId}
          templateIds={templateIds}
          scheduleRange={{
            from: scheduleRange?.from || new Date(),
            to: scheduleRange?.to || new Date(),
          }}
          selectedContentItems={selectedContentItems}
          setSelectedContentItems={setSelectedContentItems}
          publishDateTimeMap={publishDateTimeMap}
          setPublishDateTimeMap={setPublishDateTimeMap}
        />
      </form>
    </div>
  );
}
