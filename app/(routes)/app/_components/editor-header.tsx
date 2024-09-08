import { Spinner } from "@/src/components/common/loading-spinner";
import { Button } from "@/src/components/ui/button";
import InputText from "@/src/components/ui/input/text";
import { CheckIcon, PencilIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";

import { LEARN_TEMPLATE_CREATION_GUIDE_LINK } from "@/src/consts/links";

export const EDITOR_HEADER_HEIGHT = 70;

export default function EditorHeader({
  initialTitle,
  isSaving,
  onSave,
  onClose,
  isTitleEditable,
  contentType,
  sourceDataView,
}: {
  initialTitle: string;
  isSaving: boolean;
  onSave: (title: string) => void;
  onClose: () => void;
  isTitleEditable?: boolean;
  contentType: string;
  sourceDataView: string;
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
            className="mr-2 cursor-pointer text-xl font-semibold text-secondary-foreground text-white"
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
            className="h-8 w-8 cursor-pointer rounded-full p-2  text-secondary-foreground text-white hover:bg-gray-600"
            onClick={() => {
              setIsEditingTitle(true);
            }}
          />
        )}
        <div className="ml-10 flex gap-x-8">
          <div className="gap-1">
            <p className="text-xs text-gray-400">Schedule type</p>
            <p className="text-sm text-white">{`${sourceDataView}`}</p>
          </div>
          <div className="gap-1">
            <p className="text-xs text-gray-400">Content type</p>
            <p className="text-sm text-white">{`${contentType}`}</p>
          </div>
        </div>
      </div>

      <div className="flex-1"></div>

      <a
        href={LEARN_TEMPLATE_CREATION_GUIDE_LINK}
        className="mr-4 text-sm text-blue-400 text-primary hover:underline"
        target="_blank"
      >
        Learn how to create templates in our editor
      </a>
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
