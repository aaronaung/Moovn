import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import SaveTemplateForm, {
  SaveTemplateFormSchemaType,
} from "../forms/save-template-form";
import { Tables } from "@/types/db";

export function SaveTemplateDialog({
  initFormValues,
  availableSources,
  onClose,
  isOpen,
}: {
  initFormValues?: SaveTemplateFormSchemaType;
  availableSources: Tables<"sources">[];
  onClose: () => void;
  isOpen: boolean;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {initFormValues ? "Edit" : "Add"} design template
          </DialogTitle>
        </DialogHeader>
        <SaveTemplateForm
          defaultValues={initFormValues}
          availableSources={availableSources}
          onSubmitted={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
