import { useState } from "react";
import { TemplateItemType } from "@/src/consts/templates";
import InputSelect from "@/src/components/ui/input/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/src/components/ui/sheet";
import CreateCustomDesignTemplateBody from "./create-custom-design-template-body";
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
  const [templateItemType, setTemplateItemType] = useState<TemplateItemType>(
    TemplateItemType.Image,
  );

  function handleOnClose() {
    setTemplateItemType(TemplateItemType.Image);
    onClose();
  }

  const renderSheetBody = () => {
    switch (templateItemType) {
      case TemplateItemType.Image:
        return (
          <CreateCustomDesignTemplateBody
            user={user}
            parentTemplate={parentTemplate}
            itemPosition={itemPosition}
            onCreateComplete={onAddComplete}
          />
        );

      case TemplateItemType.DriveVideo:
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
            label="Template item type"
            className="mb-4 w-[300px]"
            options={Object.values(TemplateItemType).map((type) => ({
              label: type,
              value: type,
            }))}
            value={templateItemType}
            onChange={(value) => setTemplateItemType(value as TemplateItemType)}
          />
          {renderSheetBody()}
        </div>
      </SheetContent>
    </Sheet>
  );
}
