import { useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/src/components/ui/tooltip";
import InputTextArea from "@/src/components/ui/input/textarea";
import { cn } from "@/src/utils";
import { DESIGN_WIDTH } from "@/app/(routes)/app/calendar/schedule-content/_components/design-content-item";

interface EditableCaptionProps {
  initialCaption: string;
  onSave: (caption: string) => Promise<void> | void;
  className?: string;
}

export const EditableCaption: React.FC<EditableCaptionProps> = ({
  initialCaption,
  onSave,
  className,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [caption, setCaption] = useState<string>(initialCaption);

  const handleSave = async () => {
    await onSave(caption);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setCaption(initialCaption);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className={cn("group mt-3 rounded-md px-1", className)}>
        <InputTextArea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="mt-0 placeholder:text-xs "
          inputProps={
            {
              style: {
                fontSize: "14px",
              },
              placeholder: "Instagram caption",
              rows: Math.min(12, caption.split("\n").length),
            } as React.TextareaHTMLAttributes<HTMLTextAreaElement>
          }
        />
        <div className="flex gap-2 py-2">
          <Button onClick={handleSave} className="flex-1 rounded-md" size="sm">
            Save
          </Button>
          <Button onClick={handleCancel} className="flex-1 rounded-md" size="sm" variant="outline">
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger className="w-full">
        <p
          onClick={() => setIsEditing(true)}
          className={cn(
            "mt-2 max-h-[300px] cursor-pointer overflow-scroll whitespace-pre-wrap p-2 text-left text-sm group-hover:bg-secondary",
            !caption && "text-muted-foreground",
            className,
          )}
          style={{
            maxWidth: DESIGN_WIDTH,
          }}
        >
          {caption || "Add caption here..."}
        </p>
      </TooltipTrigger>
      <TooltipContent>Click to {!caption ? "add" : "edit"}</TooltipContent>
    </Tooltip>
  );
};
