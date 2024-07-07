import z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/src/components/ui/button";
import { Loader2 } from "lucide-react";
import InputSelect from "../ui/input/select";

import { useAuthUser } from "@/src/contexts/auth";
import { useSupaMutation, useSupaQuery } from "@/src/hooks/use-supabase";
import { toast } from "../ui/use-toast";
import { saveContent } from "@/src/data/content";
import { cn } from "@/src/utils";
import { SourceDataView } from "@/src/consts/sources";
import { getTemplatesBySchedule, getTemplatesForContent } from "@/src/data/templates";
import InputTextArea from "../ui/input/textarea";
import { Tables } from "@/types/db";
import { Spinner } from "../common/loading-spinner";
import { Label } from "../ui/label";
import _ from "lodash";
import { useEffect, useState } from "react";
import { getScheduleDataForSource } from "@/src/data/sources";
import { renderCaption } from "@/src/libs/content";
import { useLiveQuery } from "dexie-react-hooks";
import { useGenerateDesign } from "@/src/hooks/use-generate-design";
import { db } from "@/src/libs/indexeddb/indexeddb";
import { supaClientComponentClient } from "@/src/data/clients/browser";
import { BUCKETS } from "@/src/consts/storage";

const formSchema = z.object({
  caption: z.string().min(1, { message: "Caption is required." }),
  source_id: z.string().min(1, { message: "Source is required." }),
  source_data_view: z.string().min(1, { message: "Schedule is required." }),
  destination_id: z.string().min(1, { message: "Destination is required." }),
  template_ids: z.array(z.string()).min(1, { message: "At least one design is required." }),
});

export type SaveContentFormSchemaType = z.infer<typeof formSchema> & {
  id?: string;
};

type SaveContentFormProps = {
  availableSources: Tables<"sources">[];
  availableDestinations: Tables<"destinations">[];
  defaultValues?: SaveContentFormSchemaType;
  onSubmitted: () => void;
};

export default function SaveContentForm({
  availableSources,
  availableDestinations,
  defaultValues,
  onSubmitted,
}: SaveContentFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<SaveContentFormSchemaType>({
    defaultValues: {
      source_data_view:
        defaultValues?.source_data_view === undefined
          ? SourceDataView.TODAY
          : defaultValues.source_data_view,
      ...defaultValues,
      template_ids: defaultValues?.template_ids || [],
    },
    resolver: zodResolver(formSchema),
  });
  const { user } = useAuthUser();
  const sourceId = watch("source_id");
  const sourceDataView = watch("source_data_view");
  const templateIds = watch("template_ids") || [];
  const caption = watch("caption") || "";

  const { data: scheduleData, isLoading: isLoadingScheduleData } = useSupaQuery(
    getScheduleDataForSource,
    {
      queryKey: ["getScheduleDataForSource", sourceId, sourceDataView],
      enabled: !!sourceDataView,
      arg: {
        id: sourceId || "",
        view: sourceDataView as SourceDataView,
      },
    },
  );
  const { data: templates, isLoading: isLoadingTemplates } = useSupaQuery(getTemplatesBySchedule, {
    queryKey: ["getTemplatesBySchedule", sourceDataView],
    arg: sourceDataView as SourceDataView,
  });
  const { data: initialTemplates } = useSupaQuery(getTemplatesForContent, {
    queryKey: ["getTemplatesForContent", defaultValues?.id],
    arg: defaultValues?.id,
    enabled: !!defaultValues?.id,
  });

  useEffect(() => {
    if (sourceDataView !== defaultValues?.source_data_view) {
      // Reset template_ids when schedule selection changes.
      setValue("template_ids", []);
    }
  }, [sourceDataView, setValue, defaultValues?.source_data_view]);

  useEffect(() => {
    if (initialTemplates) {
      setValue(
        "template_ids",
        initialTemplates.map((t) => t.id),
      );
    }
  }, [initialTemplates, setValue]);

  const { mutate: _saveContent, isPending: isSavingPost } = useSupaMutation(saveContent, {
    invalidate: [
      ["getPostsForAuthUser"],
      defaultValues?.id ? ["getTemplatesForContent", defaultValues.id] : [],
    ],
    onSuccess: () => {
      onSubmitted();
    },
    onError: (error) => {
      console.error(error);
      toast({
        title: "Failed to save changes",
        variant: "destructive",
        description: "Please try again or contact support.",
      });
    },
  });

  const handleOnFormSuccess = async (formValues: SaveContentFormSchemaType) => {
    if (user?.id) {
      _saveContent({
        content: {
          owner_id: user.id,
          ...(defaultValues?.id ? { id: defaultValues.id } : {}),
          ..._.omit(formValues, "template_ids"),
        },
        templateIds: formValues.template_ids,
      });
    }
  };

  const renderDesignSelectItems = () => {
    if (!user) {
      return <></>;
    }
    if (isLoadingTemplates) {
      return <Spinner />;
    }
    if (!templates || templates.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">{`No designs found for ${sourceDataView.toLowerCase()}'s schedule. Please select a different schedule`}</p>
      );
    }
    return templates.map((template) => (
      <>
        <DesignSelectItem
          key={template.id}
          index={templateIds.indexOf(template.id)}
          sourceId={sourceId}
          template={template}
          isSelected={templateIds.includes(template.id)}
          onSelect={() => {
            const newSet = new Set(templateIds);
            if (newSet.has(template.id)) {
              newSet.delete(template.id);
            } else {
              newSet.add(template.id);
            }
            setValue("template_ids", Array.from(newSet));
            trigger("template_ids");
          }}
        />
      </>
    ));
  };

  const hasTemplates = templates && templates.length > 0;
  return (
    <form
      className="flex flex-col gap-y-3 overflow-hidden p-1"
      onSubmit={handleSubmit(handleOnFormSuccess)}
    >
      {availableSources.length > 0 && (
        <InputSelect
          rhfKey="source_id"
          options={(availableSources || []).map((s) => ({
            label: `${s.name} (${s.type})`,
            value: s.id,
          }))}
          control={control}
          error={errors.source_id?.message}
          label="Source"
          inputProps={{
            placeholder: "Select a data source",
          }}
        />
      )}
      <InputSelect
        rhfKey="source_data_view"
        options={Object.keys(SourceDataView).map((key) => ({
          // @ts-ignore
          label: SourceDataView[key],
          // @ts-ignore
          value: SourceDataView[key],
        }))}
        control={control}
        error={errors.source_data_view?.message}
        label="Schedule range"
        inputProps={{
          placeholder: "Select a schedule range",
        }}
      />
      {availableDestinations.length > 0 && (
        <InputSelect
          rhfKey="destination_id"
          options={(availableDestinations || []).map((d) => ({
            label: `${d.name} (${d.type})`,
            value: d.id,
          }))}
          control={control}
          error={errors.destination_id?.message}
          label="Destination"
          inputProps={{
            placeholder: "Select a destination to publish to",
          }}
        />
      )}
      <div>
        <div className="flex items-center">
          <Label className="flex-1 leading-4">Pick designs to include in the post</Label>
          <p className="text-sm text-muted-foreground">{(templates || []).length} available</p>
        </div>

        <div className="mt-2 flex w-full gap-x-2 overflow-scroll">{renderDesignSelectItems()}</div>
        <p className="my-1 text-xs text-muted-foreground">
          The order in a carousel post is determined by the number displayed on each selected
          design.
        </p>
        {templateIds.length > 1 && (
          <>
            <p className="mt-2 text-xs text-muted-foreground text-yellow-600">{`Multiple designs selected. This post will be published as a carousel.`}</p>
          </>
        )}
        <p className="my-2 text-sm text-destructive">{errors.template_ids?.message}</p>
      </div>
      <div className=" grid grid-cols-2 gap-6">
        <InputTextArea
          rhfKey="caption"
          register={register}
          error={errors.caption?.message}
          label="Caption"
          className="col-span-1"
          textareaProps={{
            rows: 7,
            placeholder: "Write a caption for this post",
          }}
        />
        {scheduleData && (
          <div className="col-span-1">
            <Label className="leading-4">Preview</Label>
            <p className="mt-1 overflow-scroll whitespace-pre-wrap rounded-md bg-secondary p-3">
              {renderCaption(caption, scheduleData as any)}
            </p>
          </div>
        )}
      </div>

      <Button
        className="float-right mt-6"
        type="submit"
        disabled={isSavingPost || !hasTemplates || templateIds.length === 0}
      >
        {isSavingPost ? <Loader2 className="animate-spin" /> : "Save"}
      </Button>
    </form>
  );
}

const DesignSelectItem = ({
  index,
  sourceId,
  template,
  isSelected,
  onSelect,
}: {
  index: number;
  sourceId: string;
  template: Tables<"templates">;
  isSelected: boolean;
  onSelect: () => void;
}) => {
  const { generateDesign, isLoading, isScheduleEmpty } = useGenerateDesign();
  const designFromIndexedDb = useLiveQuery(async () => {
    const design = await db.designs.get(template.id);
    if (!design) {
      return undefined;
    }
    return {
      jpgUrl: URL.createObjectURL(new Blob([design.jpg], { type: "image/jpeg" })),
      psdUrl: URL.createObjectURL(new Blob([design.psd], { type: "image/vnd.adobe.photoshop" })),
    };
  });
  const [isLoadingOverwrites, setIsLoadingOverwrites] = useState(false);
  const [designOverwrite, setDesignOverwrite] = useState<{ jpgUrl?: string; psdUrl?: string }>();
  const designJpgUrl = designOverwrite?.jpgUrl || designFromIndexedDb?.jpgUrl;
  const designPsdUrl = designOverwrite?.psdUrl || designFromIndexedDb?.psdUrl;

  useEffect(() => {
    const fetchOverwrites = async () => {
      try {
        setIsLoadingOverwrites(true);
        const result = await supaClientComponentClient.storage
          .from(BUCKETS.designs)
          .createSignedUrls(
            [`${template.owner_id}/${template.id}.psd`, `${template.owner_id}/${template.id}.jpeg`],
            24 * 60 * 60,
          );
        if (!result.data) {
          console.log("failed to create signed url", result.error);
          return;
        }

        for (const overwrite of result.data) {
          if (overwrite.signedUrl) {
            if (overwrite.path === `${template.owner_id}/${template.id}.psd`) {
              setDesignOverwrite((prev) => ({ ...prev, psdUrl: overwrite.signedUrl }));
            } else if (overwrite.path === `${template.owner_id}/${template.id}.jpeg`) {
              setDesignOverwrite((prev) => ({ ...prev, jpgUrl: overwrite.signedUrl }));
            }
          }
        }
      } finally {
        setIsLoadingOverwrites(false);
      }
    };
    fetchOverwrites();
    generateDesign(template, {
      id: sourceId,
      view: template.source_data_view as SourceDataView,
    });
  }, []);

  return (
    <div
      key={template.id}
      className={cn(
        "flex h-fit min-h-[225px] w-[200px] shrink-0 cursor-pointer flex-col items-center justify-center gap-2 rounded-md px-3 pb-3 pt-1 hover:bg-secondary",
        (isSelected || isLoading) && "bg-secondary",
      )}
      onClick={() => {
        if (isScheduleEmpty) {
          return;
        }
        onSelect();
      }}
    >
      {isLoading || isLoadingOverwrites ? (
        <Spinner />
      ) : (
        <div>
          <div className="flex h-8 items-center">
            <p className="flex-1 text-xs text-muted-foreground">{template.name}</p>
            <div>
              {isSelected ? (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-700">
                  <p className="text-xs text-secondary">{index + 1}</p>
                </div>
              ) : (
                <></>
              )}
            </div>
          </div>
          {isScheduleEmpty ? (
            <p className="text-xs text-destructive">No schedule data found for the design</p>
          ) : (
            <img src={designJpgUrl} className="max-h-full max-w-full" alt={template.name} />
          )}
        </div>
      )}
    </div>
  );
};
