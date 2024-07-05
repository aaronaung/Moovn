import z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import InputText from "../ui/input/text";
import { Button } from "@/src/components/ui/button";
import { Loader2 } from "lucide-react";
import InputSelect from "../ui/input/select";

import { useAuthUser } from "@/src/contexts/auth";
import { useSupaMutation } from "@/src/hooks/use-supabase";
import { toast } from "../ui/use-toast";
import { saveDestination } from "@/src/data/destinations";
import { DestinationTypes } from "@/src/consts/destinations";

const formSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  type: z.string().min(1, { message: "Type is required." }),
});

export type SaveDestinationFormSchemaType = z.infer<typeof formSchema> & {
  id?: string;
};

type SaveDestinationFormProps = {
  defaultValues?: SaveDestinationFormSchemaType;
  onSubmitted: () => void;
};

export default function SaveDestinationForm({ defaultValues, onSubmitted }: SaveDestinationFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SaveDestinationFormSchemaType>({
    defaultValues: {
      type: defaultValues?.type === undefined ? DestinationTypes.INSTAGRAM : defaultValues.type,
      ...defaultValues,
    },
    resolver: zodResolver(formSchema),
  });
  const { user } = useAuthUser();
  const { mutate: _saveDestination, isPending: isSavingDestination } = useSupaMutation(saveDestination, {
    invalidate: [["getDestinationsForAuthUser"]],
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

  const handleOnFormSuccess = async (formValues: SaveDestinationFormSchemaType) => {
    if (user?.id) {
      _saveDestination({
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
          placeholder: "Give your destination a name (e.g. 'Studio XYZ instagram')",
        }}
        error={errors.name?.message}
      />
      <InputSelect
        rhfKey="type"
        options={Object.values(DestinationTypes).map((st) => ({
          label: st,
          value: st,
        }))}
        control={control}
        error={errors.type?.message}
        description="Select the platfrom to which you want to publish designs."
        label="Destination"
      />

      <Button className="float-right mt-6" type="submit" disabled={isSavingDestination}>
        {isSavingDestination ? <Loader2 className="animate-spin" /> : "Save"}
      </Button>
    </form>
  );
}
