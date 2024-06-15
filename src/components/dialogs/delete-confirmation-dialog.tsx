import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import InputText from "../ui/input/text";

interface DeleteConfirmationDialogProps {
  label?: string;
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

export function DeleteConfirmationDialog({
  label,
  isOpen,
  onClose,
  onDelete,
  isDeleting = false,
}: DeleteConfirmationDialogProps) {
  const [inputValue, setInputValue] = useState("");

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    setInputValue(event.target.value);
  }

  function handleDelete() {
    onDelete();
    setInputValue("");
    onClose();
  }

  function handleOnClose() {
    setInputValue("");
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOnClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete confirmation</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {label || "Are you sure you want to perform this action?"}
          </DialogDescription>
          <InputText
            className="mt-4"
            description="Type 'delete' to confirm."
            inputProps={{
              value: inputValue,
              onChange: handleInputChange,
            }}
          />
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={inputValue !== "delete" || isDeleting}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
