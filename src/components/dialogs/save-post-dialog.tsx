import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/src/components/ui/dialog";
import SavePostForm, { SavePostFormSchemaType } from "../forms/save-post-form";
import { Tables } from "@/types/db";

export function SavePostDialog({
  destination,
  initFormValues,
  onClose,
  isOpen,
}: {
  destination: Tables<"destinations">;
  initFormValues?: SavePostFormSchemaType;
  onClose: () => void;
  isOpen: boolean;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:min-w-[680px]">
        <DialogHeader>
          <DialogTitle>{initFormValues ? "Update" : "Create"} post</DialogTitle>
        </DialogHeader>
        <SavePostForm destination={destination} defaultValues={initFormValues} onSubmitted={onClose} />
      </DialogContent>
    </Dialog>
  );
}
