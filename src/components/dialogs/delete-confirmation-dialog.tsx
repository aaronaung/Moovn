import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium">{label || "Delete"}</p>
          <InputText
            description="Type 'delete' to confirm."
            inputProps={{
              value: inputValue,
              onChange: handleInputChange,
            }}
          />
        </div>
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
