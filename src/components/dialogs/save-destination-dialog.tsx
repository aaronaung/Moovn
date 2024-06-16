import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import SaveDestinationForm, {
  SaveDestinationFormSchemaType,
} from "../forms/save-destination-form";

export function SaveDestinationDialog({
  initFormValues,
  onClose,
  isOpen,
}: {
  initFormValues?: SaveDestinationFormSchemaType;
  onClose: () => void;
  isOpen: boolean;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initFormValues ? "Edit" : "Add"} destination
          </DialogTitle>
        </DialogHeader>
        <SaveDestinationForm
          defaultValues={initFormValues}
          onSubmitted={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
