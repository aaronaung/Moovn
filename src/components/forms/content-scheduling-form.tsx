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
import { CONTENT_TYPES_BY_DESTINATION_TYPE, ContentType } from "@/src/consts/content";
import { organizeScheduleDataByView } from "@/src/libs/sources/utils";
import { InstagramIcon } from "@/src/components/ui/icons/instagram";
import { renderCaption } from "@/src/libs/content";
import { cn } from "@/src/utils";
import _ from "lodash";
import { ScheduleData } from "@/src/libs/sources/common";
import { DesignContainer } from "../common/design-container";
import { useMemo } from "react";

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

  const allowedDestinations = availableDestinations.filter((destination) => {
    const selectedTemplate = availableTemplates.find((t) => t.id === templateId);
    return CONTENT_TYPES_BY_DESTINATION_TYPE[destination.type].includes(
      selectedTemplate?.content_type || "",
    );
  });

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
  const scheduleDataByView = useMemo(
    () => organizeScheduleDataByView(template?.source_data_view!, scheduleRange, scheduleData!),
    [template?.source_data_view!, scheduleData, scheduleRange],
  );

  if (isLoadingScheduleData || isLoadingTemplate) {
    return <Spinner />;
  }
  console.log({ scheduleDataByView });

  const renderContent = (idbKey: string, scheduleData: ScheduleData) => {
    if (!template || !scheduleData) {
      return <></>;
    }

    let contentComp = <></>;
    switch (template.content_type) {
      case ContentType.InstagramPost:
      case ContentType.InstagramStory:
        contentComp = (
          <InstagramContent
            key={idbKey}
            designIdbKey={idbKey}
            scheduleData={scheduleData}
            template={template}
          />
        );
        break;
      default:
        return <></>;
    }

    return contentComp;
  };

  return (
    <div>
      <div className="my-3 flex items-end">
        <div className="flex-1">
          <Header2 title="Generated designs" />
          <p className="text-sm text-muted-foreground">
            If you think the design is incorrect, you can refresh the design or edit to overwrite
            it.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 overflow-scroll">
        {Object.entries(scheduleDataByView).map(([idbKey, scheduleData]) =>
          renderContent(idbKey, scheduleData),
        )}
      </div>
    </div>
  );
}

function InstagramContent({
  designIdbKey,
  template,
  scheduleData,
}: {
  designIdbKey: string;
  template: Tables<"templates">;
  scheduleData: ScheduleData;
}) {
  return (
    <div className="w-fit max-w-[300px] rounded-md bg-secondary" key={designIdbKey}>
      <div className="flex items-center gap-x-1 px-3 py-3">
        {/* {igMedia && igMedia.permalink && (
          <Tooltip>
            <TooltipTrigger>
              <Link href={igMedia.permalink} target="_blank">
                <div className="group cursor-pointer rounded-full p-1.5 hover:bg-primary">
                  <InstagramIcon className="h-6 w-6 text-secondary-foreground group-hover:text-secondary" />
                </div>
              </Link>
            </TooltipTrigger>
            <TooltipContent>Go to the instagram content</TooltipContent>
          </Tooltip>
        )} */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <InstagramIcon className="h-4 w-4 fill-purple-600 text-secondary-foreground" />
            <p className="text-xs font-medium text-pink-600">
              {template.content_type.split(" ")[1]}
            </p>
          </div>
        </div>
      </div>
      <div className={cn("flex flex-col items-center")}>
        <DesignContainer idbKey={designIdbKey} scheduleData={scheduleData} template={template} />
      </div>
      {!_.isEmpty(scheduleData) && template.ig_caption_template && (
        <div className="max-w-[300px] overflow-scroll p-2">
          <p className="overflow-scroll whitespace-pre-wrap text-sm">
            {renderCaption(template.ig_caption_template || "", scheduleData as any)}
          </p>
        </div>
      )}
    </div>
  );
}
