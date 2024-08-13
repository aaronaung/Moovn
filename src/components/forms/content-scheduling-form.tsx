import { Tables } from "@/types/db";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import InputSelect from "../ui/input/select";
import { Spinner } from "@/src/components/common/loading-spinner";
import { useSupaQuery } from "@/src/hooks/use-supabase";
import { Header2 } from "@/src/components/common/header";
import { getScheduleDataForSourceByTimeRange } from "@/src/data/sources";
import { getTemplateById } from "@/src/data/templates";
import InputDateRangePicker from "../ui/input/date-range-picker";
import { Badge } from "../ui/badge";
import { SourceDataView } from "@/src/consts/sources";
import { ScheduleData } from "@/src/libs/sources/common";
import {
  addWeeks,
  differenceInDays,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  min,
  startOfWeek,
} from "date-fns";

const formSchema = z.object({
  source_id: z.string(),
  template_id: z.string(),
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

export default function ContentSchedulingForm({
  availableSources,
  availableDestinations,
  availableTemplates,
}: {
  availableSources: Tables<"sources">[];
  availableTemplates: Tables<"templates">[];
  availableDestinations: Tables<"destinations">[];
}) {
  const {
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ContentSchedulingFormSchema>({
    defaultValues: {
      source_id: availableSources?.[0].id || "",
      destination_id: availableDestinations?.[0].id || "",
      template_id: availableTemplates?.[0].id || "",
      schedule_range: {
        from: new Date(),
        to: new Date(),
      },
    },
    resolver: zodResolver(formSchema),
  });
  const sourceId = watch("source_id");
  const templateId = watch("template_id");
  const scheduleRange = watch("schedule_range");

  return (
    <form className="flex flex-col gap-y-3">
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
      <InputSelect
        label="Destination"
        className="md:w-[620px]"
        rhfKey={"destination_id"}
        options={availableDestinations.map((destination) => ({
          value: destination.id,
          label: destination.name,
        }))}
        control={control}
        error={errors.destination_id?.message}
        inputProps={{
          placeholder: "Select a destination",
        }}
      />
      <div className="flex gap-x-3">
        <InputSelect
          label="Template"
          rhfKey={"template_id"}
          className="w-full md:w-[620px]"
          options={availableTemplates.map((template) => ({
            value: template.id,
            label: template.name,
          }))}
          control={control}
          error={errors.template_id?.message}
          inputProps={{
            placeholder: "Select a template",
          }}
        />
        <Badge className="mb-2 h-[30px] min-w-[110px] self-end text-center">
          {availableTemplates.find((t) => t.id === templateId)?.source_data_view} schedule
        </Badge>
      </div>
      <ContentList sourceId={sourceId} templateId={templateId} scheduleRange={scheduleRange} />
    </form>
  );
}

function ContentList({
  sourceId,
  templateId,
  scheduleRange,
}: {
  sourceId: string;
  templateId: string;
  scheduleRange: {
    from: Date;
    to: Date;
  };
}) {
  const { data: template, isLoading: isLoadingTemplate } = useSupaQuery(getTemplateById, {
    queryKey: ["getTemplateById", templateId],
    arg: templateId,
  });
  const { data: scheduleData, isLoading: isLoadingScheduleData } = useSupaQuery(
    getScheduleDataForSourceByTimeRange,
    {
      queryKey: ["getScheduleDataForSourceByTimeRange", sourceId, scheduleRange],
      arg: {
        id: sourceId,
        dateRange: scheduleRange,
      },
    },
  );

  console.log({ scheduleData });
  function getWeeklyRanges() {
    const ranges: { start: Date; end: Date }[] = [];
    const start = new Date(scheduleRange.from);
    const end = new Date(scheduleRange.to);

    let tempStart = start;
    let tempEnd: Date;

    while (isBefore(tempStart, end)) {
      tempEnd = min([endOfWeek(tempStart), end]);
      ranges.push({ start: tempStart, end: tempEnd });
      tempStart = addWeeks(startOfWeek(tempStart), 1);
    }

    return ranges;
  }

  function organizeSchedule(view: string, scheduleData: ScheduleData) {
    const organizedData: { [key: string]: any } = {};
    const numDays = differenceInDays(scheduleRange.to, scheduleRange.from);

    // Helper function to get the start and end of a week
    switch (view) {
      case SourceDataView.Daily:
        for (let i = 0; i < numDays; i++) {
          for (const key in scheduleData) {
            if (key.startsWith(`day#${i + 1}.`)) {
              organizedData[scheduleData[`day#${i + 1}.date`]] = {
                ...(organizedData[scheduleData[`day#${i + 1}.date`]] || {}),
                // Replace the day number with 1
                [key.replaceAll(`day#${i + 1}.`, "day#1.")]: scheduleData[key],
              };
            }
          }
        }
        break;
      case SourceDataView.Weekly:
        const weeklyRanges = getWeeklyRanges();
        let weekIndex = 0;
        let lastDayNumberBeforeWeekSwitch = 0;
        for (const key in scheduleData) {
          const keySplit = key.split(".");
          const dayNumberInKey = parseInt(keySplit[0].split("#")[1]);
          const date = scheduleData[`day#${dayNumberInKey}.date`];

          const weekRange = weeklyRanges[weekIndex];
          if (isAfter(new Date(date), weekRange.end)) {
            weekIndex++;
            lastDayNumberBeforeWeekSwitch = dayNumberInKey - 1;
          }
          const weeklyKey = `${format(weeklyRanges[weekIndex].start, "yyyy-MM-dd")} - ${format(
            weeklyRanges[weekIndex].end,
            "yyyy-MM-dd",
          )}`;
          const dailyKey = key.replaceAll(
            `day#${dayNumberInKey}.`,
            `day#${dayNumberInKey - lastDayNumberBeforeWeekSwitch}.`,
          );
          organizedData[weeklyKey] = {
            ...(organizedData[weeklyKey] || {}),
            [dailyKey]: scheduleData[key],
          };
        }
        break;
    }

    return organizedData;
  }
  console.log({ organizeSchedule: organizeSchedule(template?.source_data_view!, scheduleData!) });

  if (isLoadingScheduleData || isLoadingTemplate) {
    return <Spinner />;
  }
  // console.log({ organizeSchedule: organizeSchedule(template?.source_data_view!, scheduleData!) });

  const renderContent = (
    content: Tables<"content"> & { destination: Tables<"destinations"> | null },
  ) => {
    let contentComp = <></>;
    // switch (content.destination?.type) {
    //   case DestinationTypes.Instagram:
    //     contentComp = <InstagramContent key={content.id} content={content} />;
    //     break;
    //   default:
    //     return <></>;
    // }

    return contentComp;
  };

  return (
    <div>
      <div className="mb-3 flex items-end">
        <div className="flex-1">
          <Header2 title="Content" />
          <p className="text-sm text-muted-foreground">
            Content is auto-generated from a template and can be published to a destination. If you
            think an auto-generated design is incorrect, you can refresh the design or edit to
            overwrite it.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 overflow-scroll"></div>
    </div>
  );
}
