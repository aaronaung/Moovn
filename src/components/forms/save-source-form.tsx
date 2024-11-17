import z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import InputText from "../ui/input/text";
import { Button } from "@/src/components/ui/button";
import { Loader2 } from "lucide-react";
import InputSelect from "../ui/input/select";

import { SourceTypes } from "@/src/consts/sources";
import { useAuthUser } from "@/src/contexts/auth";
import { useSupaMutation } from "@/src/hooks/use-supabase";
import { saveSource } from "@/src/data/sources";
import { toast } from "../ui/use-toast";
import { useEffect } from "react";

const formSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  type: z.string().min(1, { message: "Type is required." }),
  settings: z
    .object({
      url: z.string().url({ message: "Must be a valid url." }).optional(),
      site_id: z.string().min(1, { message: "Site ID is required." }).optional(),
    })
    .optional(),
});

export type SaveSourceFormSchemaType = z.infer<typeof formSchema> & {
  id?: string;
  settings: any;
};

type SaveSourceFormProps = {
  defaultValues?: SaveSourceFormSchemaType;
  onSubmitted: () => void;
};

export default function SaveSourceForm({ defaultValues, onSubmitted }: SaveSourceFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<SaveSourceFormSchemaType>({
    defaultValues: {
      type: defaultValues?.type === undefined ? SourceTypes.Pike13 : defaultValues.type,
      ...defaultValues,
    },
    resolver: zodResolver(formSchema),
  });
  const selectedSourceType = watch("type");
  const siteId = watch("settings.site_id");

  useEffect(() => {
    setValue("settings", {});
  }, [selectedSourceType]);

  const { user } = useAuthUser();
  const { mutate: _saveSource, isPending: isSavingSource } = useSupaMutation(saveSource, {
    invalidate: [
      ["getAllSources"],
      ["getScheduleDataForSource", defaultValues?.id ?? ""],
      ["getMindbodyActivationCodeAndLink", siteId],
      ["getMindbodySiteData", siteId],
    ],
    onSuccess: () => {
      onSubmitted();
    },
    onError: (error) => {
      console.error(error);
      toast({
        title: "Failed to save changes",
        variant: "destructive",
        description: "Make sure the Source name is unique. Please try again or contact support.",
      });
    },
  });

  const renderSourceSettings = () => {
    switch (selectedSourceType) {
      case SourceTypes.Pike13:
        return (
          <>
            <InputText
              label="Pike13 URL"
              rhfKey="settings.url"
              register={register}
              inputProps={{
                placeholder: "Enter your Pike13 business URL",
              }}
              error={(errors.settings as any)?.url?.message}
            />
          </>
        );
      case SourceTypes.Mindbody:
        return (
          <>
            <InputText
              label="Site ID"
              rhfKey="settings.site_id"
              register={register}
              inputProps={{
                placeholder: "Enter your Mindbody Site ID",
              }}
              error={(errors.settings as any)?.site_id?.message}
            />
          </>
        );

      default:
        return null;
    }
  };

  const handleOnFormSuccess = async (formValues: SaveSourceFormSchemaType) => {
    if (formValues.type === SourceTypes.Pike13 && !formValues.settings.url) {
      setError("settings.url", {
        message: "Pike13 URL is required.",
      });
      return;
    }
    if (formValues.type === SourceTypes.Mindbody && !formValues.settings.site_id) {
      setError("settings.site_id", {
        message: "Site ID is required.",
      });
      return;
    }
    if (user?.id) {
      _saveSource({
        ...(defaultValues?.id ? { id: defaultValues.id } : {}),
        ...formValues,
        owner_id: user?.id,
      });
    }
  };

  return (
    <form
      className="flex flex-col gap-y-3"
      onSubmit={handleSubmit(handleOnFormSuccess, (err) => {
        console.log(err);
      })}
    >
      <InputText
        label="Name"
        rhfKey="name"
        register={register}
        inputProps={{
          placeholder: "Source name (e.g. Studio XYZ)",
        }}
        error={errors.name?.message}
      />
      <InputSelect
        disabled={defaultValues?.id !== undefined}
        rhfKey="type"
        options={Object.values(SourceTypes).map((st) => ({
          label: st,
          value: st,
        }))}
        control={control}
        error={errors.type?.message}
        description="The platfrom from which you want to pull data. Not editable after creation"
        label="Data source"
      />
      {renderSourceSettings()}
      <Button className="float-right mt-6" type="submit" disabled={isSavingSource}>
        {isSavingSource ? <Loader2 className="animate-spin" /> : "Save"}
      </Button>
    </form>
  );
}
