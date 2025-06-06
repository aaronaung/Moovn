import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/src/components/ui/dialog";
import SaveSourceForm, { SaveSourceFormSchemaType } from "../forms/save-source-form";

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initFormValues ? "Update" : "Create"} source</DialogTitle>
        </DialogHeader>
        <SaveSourceForm defaultValues={initFormValues} onSubmitted={onClose} />
      </DialogContent>
    </Dialog>
  );
}
