import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/src/components/ui/dialog";
import SaveContentForm, { SaveContentFormSchemaType } from "../forms/save-content-form";
import { Tables } from "@/types/db";

export function SaveContentDialog({
  initFormValues,
  availableDestinations,
  availableSources,
  onClose,
  isOpen,
}: {
  initFormValues?: SaveContentFormSchemaType;
  availableDestinations: Tables<"destinations">[];
  availableSources: Tables<"sources">[];
  onClose: () => void;
  isOpen: boolean;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:min-w-[680px]">
        <DialogHeader>
          <DialogTitle>{initFormValues ? "Update" : "Create"} post</DialogTitle>
        </DialogHeader>
        <SaveContentForm
          availableDestinations={availableDestinations}
          availableSources={availableSources}
          defaultValues={initFormValues}
          onSubmitted={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
