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
}

export function DeleteConfirmationDialog({
  label,
  isOpen,
  onClose,
  onDelete,
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
        <div>
          <InputText
            label={label || "Are you sure you want to delete?"}
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
            disabled={inputValue !== "delete"}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
