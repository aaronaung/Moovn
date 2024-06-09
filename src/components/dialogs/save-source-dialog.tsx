import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import SaveSourceForm, {
  SaveSourceFormSchemaType,
} from "../forms/save-source-form";

export function SaveSourceDialog({
  initFormValues,
  onClose,
  isOpen,
}: {
  initFormValues?: SaveSourceFormSchemaType;
  onClose: () => void;
  isOpen: boolean;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initFormValues ? "Edit" : "Add"} source</DialogTitle>
        </DialogHeader>
        <SaveSourceForm defaultValues={initFormValues} onSubmitted={onClose} />
      </DialogContent>
    </Dialog>
  );
}
