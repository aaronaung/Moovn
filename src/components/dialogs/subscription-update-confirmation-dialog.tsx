import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import InputText from "../ui/input/text";
import {
  SubscriptionPlan,
  SubscriptionPlanUpdateType,
} from "@/src/consts/stripe";
import { getPlanUpdateType } from "@/src/libs/stripe";
import { SubscriptionRules } from "@/src/consts/stripe";

interface SubscriptionUpdateConfirmationDialogProps {
  label?: string;
  from: SubscriptionPlan;
  to: SubscriptionPlan;
  isOpen: boolean;
  onClose: () => void;
  onSubscriptionUpdate: () => void;
}

export function SubscriptionUpdateConfirmationDialog({
  label,
  from,
  to,
  isOpen,
  onClose,
  onSubscriptionUpdate,
}: SubscriptionUpdateConfirmationDialogProps) {
  const [inputValue, setInputValue] = useState("");

  function planUpdateMessage() {
    switch (getPlanUpdateType(from, to)) {
      case SubscriptionPlanUpdateType.Upgrade:
        return `You'll be charged $${SubscriptionRules[to].pricing} and granted access to the new plan immediately.`;
      case SubscriptionPlanUpdateType.Downgrade:
        return `You will have access to the current plan until the end of the billing period. The new plan will be effective, and you'll be charged $${SubscriptionRules[to].pricing} at the beginning of the next billing period.`;
      case SubscriptionPlanUpdateType.New:
        return `You'll be charged $${SubscriptionRules[to].pricing} and granted access to the new plan immediately.`;
      case SubscriptionPlanUpdateType.Cancel:
        return `Sad to see you go! You will have access to the current plan until the end of the billing period.`;
      default:
        return "";
    }
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    setInputValue(event.target.value);
  }

  function handleSubscriptionUpdate() {
    onSubscriptionUpdate();
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
          <DialogTitle>Update subscription</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-y-4">
          <p className="text-sm font-semibold text-muted-foreground">{`${from} -> ${to}`}</p>
          <p className="text-sm text-muted-foreground">{planUpdateMessage()}</p>
          <InputText
            label={
              label || "Are you sure you want to update your subscription?"
            }
            description="Type 'update' to confirm."
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
            onClick={handleSubscriptionUpdate}
            disabled={inputValue !== "update"}
          >
            Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
