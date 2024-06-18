import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/src/components/ui/dialog";
import SaveTemplateForm, { SaveTemplateFormSchemaType } from "../forms/save-template-form";
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
      <DialogContent className="sm:min-w-[680px]">
        <DialogHeader>
          <DialogTitle>{initFormValues ? "Update" : "Create"} design</DialogTitle>
        </DialogHeader>
        <SaveTemplateForm defaultValues={initFormValues} availableSources={availableSources} onSubmitted={onClose} />
      </DialogContent>
    </Dialog>
  );
}
