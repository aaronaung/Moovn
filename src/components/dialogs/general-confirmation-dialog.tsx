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
import { Spinner } from "../common/loading-spinner";

interface ConfirmationDialogProps {
  title: string;
  label?: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isConfirming?: boolean;
}

export function ConfirmationDialog({
  title,
  label,
  isOpen,
  onClose,
  onConfirm,
  isConfirming = false,
}: ConfirmationDialogProps) {
  const [inputValue, setInputValue] = useState("");
  const [isConfirmingInternal, setIsConfirmingInternal] = useState(false);

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    setInputValue(event.target.value);
  }

  async function handleConfirm() {
    try {
      setIsConfirmingInternal(true);
      await onConfirm();
      setInputValue("");
    } catch (err) {
      console.error("Failed to confirm action", err);
    } finally {
      onClose();
      setIsConfirmingInternal(false);
    }
  }

  function handleOnClose() {
    setInputValue("");
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOnClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {label || "Are you sure you want to perform this action?"}
          </DialogDescription>
          <InputText
            className="mt-4"
            description="Type 'yes' to confirm."
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
          <Button onClick={handleConfirm} disabled={inputValue !== "yes" || isConfirming || isConfirmingInternal}>
            {isConfirming || isConfirmingInternal ? <Spinner /> : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
