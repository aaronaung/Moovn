import { Spinner } from "@/src/components/common/loading-spinner";
import { Button } from "@/src/components/ui/button";
import InputText from "@/src/components/ui/input/text";
import { CheckIcon, PencilIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";

export const EDITOR_HEADER_HEIGHT = 70;

export default function EditorHeader({
  initialTitle,
  isSaving,
  onSave,
  onClose,
  isTitleEditable,
}: {
  initialTitle: string;
  isSaving: boolean;
  onSave: (title: string) => void;
  onClose: () => void;
  isTitleEditable?: boolean;
}) {
  const [title, setTitle] = useState<string>();
  const [pendingTitle, setPendingTitle] = useState<string>();
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  useEffect(() => {
    setTitle(initialTitle);
    setPendingTitle(initialTitle);
  }, [initialTitle]);

  return (
    <div className={`flex h-[${EDITOR_HEADER_HEIGHT}px] items-center gap-x-2 px-8 py-3`}>
      <div className={`flex h-[${EDITOR_HEADER_HEIGHT - 20}px] items-center gap-2`}>
        {isEditingTitle ? (
          <div className="flex items-center gap-x-1">
            <InputText
              className="mr-2 w-[300px]"
              value={pendingTitle}
              inputProps={{
                onKeyUp: (e) => {
                  if (e.key === "Enter") {
                    setTitle(pendingTitle);
                    setIsEditingTitle(false);
                  } else if (e.key === "Escape") {
                    setTitle(title);
                    setIsEditingTitle(false);
                  }
                },
              }}
              onChange={(e) => {
                setPendingTitle(e.target.value);
              }}
            />
            <CheckIcon
              className="h-9 w-9 cursor-pointer rounded-full p-2 text-green-600 hover:bg-gray-600"
              onClick={() => {
                setTitle(pendingTitle);
                setIsEditingTitle(false);
              }}
            />

            <XMarkIcon
              className="h-9 w-9 cursor-pointer rounded-full p-2 text-red-500 hover:bg-gray-600"
              onClick={() => {
                setTitle(title);
                setIsEditingTitle(false);
              }}
            >
              Cancel
            </XMarkIcon>
          </div>
        ) : (
          <p
            className="mr-2 cursor-pointer text-xl font-semibold text-secondary-foreground dark:text-white"
            onDoubleClick={() => {
              if (isTitleEditable) {
                setIsEditingTitle(true);
              }
            }}
          >
            {title}
          </p>
        )}
        {!isEditingTitle && isTitleEditable && (
          <PencilIcon
            className="h-8 w-8 cursor-pointer rounded-full p-2  text-secondary-foreground hover:bg-secondary dark:text-white dark:hover:bg-gray-600"
            onClick={() => {
              setIsEditingTitle(true);
            }}
          />
        )}
      </div>

      <div className="flex-1"></div>

      <Button
        className="w-[80px]"
        disabled={isSaving}
        onClick={async () => {
          onSave(pendingTitle || initialTitle);
        }}
      >
        {isSaving ? <Spinner className="text-secondary" /> : "Save"}
      </Button>
      <Button
        className="w-[80px]"
        variant="secondary"
        onClick={() => {
          onClose();
        }}
      >
        Exit
      </Button>
    </div>
  );
}
