import { useState } from "react";
import { ContentItemType } from "@/src/consts/content";
import InputSelect from "@/src/components/ui/input/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/src/components/ui/sheet";
import CreateAutoGenDesignTemplateBody from "./create-auto-gen-design-template-body";
import { Tables } from "@/types/db";

interface AddTemplateItemSheetProps {
  isOpen: boolean;
  itemPosition: number;
  user: Tables<"users">;
  parentTemplate?: Tables<"templates">;
  onClose: () => void;
  onAddComplete: (newTemplateItem: Tables<"template_items">) => void;
}

export function AddTemplateItemSheet({
  isOpen,
  itemPosition,
  user,
  parentTemplate,
  onClose,
  onAddComplete,
}: AddTemplateItemSheetProps) {
  const [forItemType, setForItemType] = useState<ContentItemType>(ContentItemType.AutoGenDesign);

  function handleOnClose() {
    setForItemType(ContentItemType.AutoGenDesign);
    onClose();
  }

  const renderSheetBody = () => {
    switch (forItemType) {
      case ContentItemType.AutoGenDesign:
        return (
          <CreateAutoGenDesignTemplateBody
            user={user}
            parentTemplate={parentTemplate}
            itemPosition={itemPosition}
            onCreateComplete={onAddComplete}
          />
        );

      case ContentItemType.DriveFile:
        return <div>Video</div>;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOnClose}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="mb-2">Add template item</SheetTitle>
        </SheetHeader>
        <div>
          <InputSelect
            label="What is the template for?"
            className="mb-4 w-[300px]"
            options={Object.values(ContentItemType).map((type) => ({
              label: type,
              value: type,
            }))}
            value={forItemType}
            onChange={(value) => setForItemType(value as ContentItemType)}
          />
          {renderSheetBody()}
        </div>
      </SheetContent>
    </Sheet>
  );
}
