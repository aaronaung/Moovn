import { Tables } from "@/types/db";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import InputSelect from "../../../../../../src/components/ui/input/select";
import InputDateRangePicker from "../../../../../../src/components/ui/input/date-range-picker";
import { CONTENT_TYPES_BY_DESTINATION_TYPE } from "@/src/consts/content";
import ContentList from "./content-list";
import InputMultiSelect from "@/src/components/ui/input/multi-select";

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

  return (
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
        {/* <Badge className="mb-2 h-[30px] min-w-[110px] self-end text-center">
          {availableTemplates.find((t) => t.id === templateId)?.source_data_view} schedule
        </Badge> */}
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
      />
    </form>
  );
}
