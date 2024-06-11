import z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import InputText from "../ui/input/text";
import { Button } from "@/src/components/ui/button";
import { Loader2 } from "lucide-react";
import InputSelect from "../ui/input/select";
import { v4 as uuid } from "uuid";

import { useSupaMutation } from "@/src/hooks/use-supabase";

import { Tables } from "@/types/db";
import { SourceDataView } from "@/src/consts/sources";
import { saveTemplate } from "@/src/data/templates";
import { useAuthUser } from "@/src/contexts/auth";
import FileDropzone from "../ui/input/file-dropzone";
import { useCallback, useEffect, useState } from "react";
import { FileRejection } from "react-dropzone";
import { toast } from "../ui/use-toast";
import { useAsyncFileUpload } from "@/src/contexts/async-file-upload";
import { BUCKETS } from "@/src/consts/storage";
import { checkIfObjectExistsAtUrl } from "@/src/libs/storage";
import { useSignedUrl } from "@/src/hooks/use-signed-url";
import { generateDesign } from "@/src/data/designs";
import { useQueryClient } from "@tanstack/react-query";
import { fetchWithRetry } from "@/src/utils";
import { supaClientComponentClient } from "@/src/data/clients/browser";

const formSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  source_id: z.string(),
  source_data_view: z.string(),
});

export type SaveTemplateFormSchemaType = z.infer<typeof formSchema> & {
  id?: string;
};

type SaveTemplateFormProps = {
  defaultValues?: SaveTemplateFormSchemaType;
  availableSources: Tables<"sources">[];
  onSubmitted: () => void;
};

export default function SaveTemplateForm({
  defaultValues,
  availableSources,
  onSubmitted,
}: SaveTemplateFormProps) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SaveTemplateFormSchemaType>({
    defaultValues: {
      source_data_view:
        defaultValues?.source_data_view === undefined
          ? SourceDataView.DAILY
          : defaultValues.source_data_view,

      ...defaultValues,
    },
    resolver: zodResolver(formSchema),
  });
  const { user, session } = useAuthUser();
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateAlreadyExists, setTemplateAlreadyExists] = useState(false);
  const asyncUploader = useAsyncFileUpload();

  const { signedUrl: currentTemplateUrl } = useSignedUrl({
    bucket: BUCKETS.templates,
    objectPath: `${user?.id}/${defaultValues?.id}.psd`,
  });
  useEffect(() => {
    if (currentTemplateUrl) {
      checkIfObjectExistsAtUrl(currentTemplateUrl).then((exists) => {
        setTemplateAlreadyExists(exists);
      });
    }
  }, [currentTemplateUrl]);

  const { mutateAsync: _saveTemplate, isPending: isSavingTemplate } =
    useSupaMutation(saveTemplate, {
      invalidate: [["getTemplatesForAuthUser"]],
    });
  const { mutateAsync: _generateDesign, isPending: isGeneratingDesign } =
    useSupaMutation(generateDesign);

  const onTemplateFileDrop = useCallback(
    async (accepted: File[], rejections: FileRejection[]) => {
      if (rejections.length > 0) {
        toast({
          variant: "destructive",
          title: "File doesn't meet requirements",
          description: "Please make sure the file is a PSD file.",
        });
        return;
      }

      setTemplateFile(accepted[0]);
    },
    [],
  );

  const handleOnFormSuccess = async (
    formValues: SaveTemplateFormSchemaType,
  ) => {
    const templateId = defaultValues?.id ?? formValues.id ?? uuid();

    try {
      if (!templateFile && !templateAlreadyExists) {
        toast({
          variant: "destructive",
          title: "Template file is required",
          description: "Please upload a PSD file for the template.",
        });
        return;
      }
      if (!user || !session?.access_token) {
        toast({
          variant: "destructive",
          title: "Session error",
          description: "Please try again or contact support.",
        });
        return;
      }

      if (templateFile) {
        asyncUploader.upload(
          {
            id: templateId,
            targets: [
              {
                file: templateFile,
                bucketName: BUCKETS.templates,
                contentType: `image/vnd.adobe.photoshop`,
                objectPath: `${user.id}/${templateId}.psd`,
              },
            ],
          },
          session?.access_token,
          {
            upsert: true,
            onComplete: async (data) => {
              if (data.failed.length > 0) {
                toast({
                  variant: "destructive",
                  title: "Failed to upload design template file.",
                  description: "Please try again or contact support.",
                });
                return;
              }
              await _saveTemplate({
                ...formValues,
                id: templateId,
                owner_id: user.id,
                latest_design_hash: null, // Bust the design hash, so we can regenerate the design
                ...(formValues.id
                  ? { updated_at: new Date().toISOString() }
                  : {}),
              });
              const { id: jobId } = await _generateDesign({
                templateId,
              });

              // Check if the generated design is available
              const { data: signedJpegUrlData } =
                await supaClientComponentClient.storage
                  .from(BUCKETS.designs)
                  .createSignedUrl(`${user.id}/${jobId}.jpeg`, 24 * 3600);

              if (signedJpegUrlData) {
                await fetchWithRetry(signedJpegUrlData?.signedUrl);
                queryClient.invalidateQueries({
                  queryKey: ["getDesignsForTemplate", templateId],
                });
              }
              onSubmitted();
            },
          },
        );
      } else {
        _saveTemplate({
          ...formValues,
          id: templateId,
          owner_id: user.id,
          ...(formValues.id ? { updated_at: new Date().toISOString() } : {}),
        });
        onSubmitted();
      }
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Failed to save design template",
        description: "Please try again or contact support.",
      });
      onSubmitted();
    }
  };

  return (
    <form
      className="flex flex-col gap-y-3"
      onSubmit={handleSubmit(handleOnFormSuccess)}
    >
      <InputText
        label="Name"
        rhfKey="name"
        register={register}
        inputProps={{
          placeholder: "Give your template a name (e.g. 'Weekly Schedule')",
        }}
        error={errors.name?.message}
      />
      {availableSources.length > 0 && (
        <InputSelect
          rhfKey="source_id"
          options={(availableSources || []).map((s) => ({
            label: s.type,
            value: s.id,
          }))}
          control={control}
          error={errors.source_id?.message}
          label="Source"
          inputProps={{
            placeholder: "Select a data source for this template",
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
        label="Data view"
        inputProps={{
          placeholder: "Select a data view for this template",
        }}
        description={`Data view represents a "view" of the source data the template will use to generate content.`}
      />
      <div>
        <p className="mt-1 text-sm font-medium">Template file</p>
        <FileDropzone
          onDrop={onTemplateFileDrop}
          options={{
            accept: { "image/vnd.adobe.photoshop": [".psd"] },
            multiple: false,
          }}
        />
        {templateAlreadyExists && (
          <p className="mt-1 text-sm text-muted-foreground">
            {`Template file already exists. Uploading a new file will replace the existing one.`}
          </p>
        )}
      </div>
      <Button
        className="float-right mt-6"
        type="submit"
        disabled={
          isSavingTemplate ||
          isGeneratingDesign ||
          asyncUploader.hasTaskInProgress
        }
      >
        {isSavingTemplate ||
        isGeneratingDesign ||
        asyncUploader.hasTaskInProgress ? (
          <Loader2 className="animate-spin" />
        ) : (
          "Save"
        )}
      </Button>
    </form>
  );
}
