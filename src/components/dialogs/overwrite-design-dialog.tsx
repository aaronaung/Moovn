import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import OverwriteDesignForm from "../forms/overwrite-design-form";
import { DialogDescription } from "@radix-ui/react-dialog";

export function OverwriteDesignDialog({
  designId,
  onClose,
  onOverwriteComplete,
  isOpen,
}: {
  designId?: string;
  onClose: () => void;
  onOverwriteComplete?: () => Promise<void>;
  isOpen: boolean;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Overwrite design</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            This will overwrite the current design with a new one.
          </DialogDescription>
        </DialogHeader>
        {designId && (
          <OverwriteDesignForm
            designId={designId}
            onSubmitted={() => {
              onOverwriteComplete?.();
              onClose();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
