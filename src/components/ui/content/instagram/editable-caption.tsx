import { useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/src/components/ui/tooltip";
import InputTextArea from "@/src/components/ui/input/textarea";
import { cn } from "@/src/utils";

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
      <div className={cn("group mt-3 rounded-md", className)}>
        <InputTextArea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="mt-0"
          inputProps={
            {
              style: {
                fontSize: "14px",
              },
              placeholder: "Add caption for Instagram post",
              rows: Math.min(12, caption.split("\n").length),
            } as React.TextareaHTMLAttributes<HTMLTextAreaElement>
          }
        />
        <div className="mt-2 flex gap-2">
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
            "max-h-[300px] w-full cursor-pointer overflow-scroll whitespace-pre-wrap p-2 text-left text-sm group-hover:bg-secondary",
            !caption && "text-muted-foreground",
            className,
          )}
        >
          {caption || "Add caption for Instagram post here..."}
        </p>
      </TooltipTrigger>
      <TooltipContent>Click to {!caption ? "add" : "edit"}</TooltipContent>
    </Tooltip>
  );
};
