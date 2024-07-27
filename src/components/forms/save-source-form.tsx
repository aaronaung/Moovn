import z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import InputText from "../ui/input/text";
import { Button } from "@/src/components/ui/button";
import { Loader2 } from "lucide-react";
import InputSelect from "../ui/input/select";

import { SourceTypes } from "@/src/consts/sources";
import { useAuthUser } from "@/src/contexts/auth";
import { useQueryClient } from "@tanstack/react-query";
import { useSupaMutation } from "@/src/hooks/use-supabase";
import { saveSource } from "@/src/data/sources";
import { toast } from "../ui/use-toast";

const formSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  type: z.string().min(1, { message: "Type is required." }),
  settings: z.object({
    url: z.string().url({ message: "Must be a valid url." }).optional(),
  }),
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
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<SaveSourceFormSchemaType>({
    defaultValues: {
      type: defaultValues?.type === undefined ? SourceTypes.Pike13 : defaultValues.type,
      ...defaultValues,
    },
    resolver: zodResolver(formSchema),
  });
  const selectedSourceType = watch("type");

  const { user } = useAuthUser();
  const { mutate: _saveSource, isPending: isSavingSource } = useSupaMutation(saveSource, {
    invalidate: [["getSourcesForAuthUser"]],
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

  const renderSourceSettings = () => {
    switch (selectedSourceType) {
      case SourceTypes.Pike13:
        return (
          <InputText
            label="Pike13 URL"
            rhfKey="settings.url"
            register={register}
            registerOptions={{
              validate: (value) => {
                if (selectedSourceType === SourceTypes.Pike13 && !value) {
                  return "URL is required.";
                }
              },
            }}
            inputProps={{
              placeholder: "Enter your Pike13 business URL",
            }}
            error={(errors.settings as any)?.url?.message}
          />
        );
      default:
        return null;
    }
  };

  const handleOnFormSuccess = async (formValues: SaveSourceFormSchemaType) => {
    if (user?.id) {
      _saveSource({
        ...(defaultValues?.id ? { id: defaultValues.id } : {}),
        ...formValues,
        owner_id: user?.id,
      });
    }
  };

  return (
    <form className="flex flex-col gap-y-3" onSubmit={handleSubmit(handleOnFormSuccess)}>
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
        rhfKey="type"
        options={Object.values(SourceTypes).map((st) => ({
          label: st,
          value: st,
        }))}
        control={control}
        error={errors.type?.message}
        description="Select the platfrom from which you want to pull data."
        label="Data source"
      />
      {renderSourceSettings()}
      <Button className="float-right mt-6" type="submit" disabled={isSavingSource}>
        {isSavingSource ? <Loader2 className="animate-spin" /> : "Save"}
      </Button>
    </form>
  );
}
