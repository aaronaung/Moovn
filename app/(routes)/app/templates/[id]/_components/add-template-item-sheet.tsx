import { useState } from "react";
import { ContentItemType, ContentType } from "@/src/consts/content";
import InputSelect from "@/src/components/ui/input/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/src/components/ui/sheet";
import AddAutoGenDesignTemplateItem from "./add-template-item-sheet-content/auto-gen-design";
import { Tables } from "@/types/db";
import AddDriveTemplateItem from "./add-template-item-sheet-content/google-drive";
import { SourceDataView } from "@/src/consts/sources";

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
  const [sourceDataView, setSourceDataView] = useState(
    (parentTemplate?.source_data_view as SourceDataView) || SourceDataView.Daily,
  );
  const [contentType, setContentType] = useState(
    (parentTemplate?.content_type as ContentType) || ContentType.InstagramPost,
  );

  function handleOnClose() {
    setForItemType(ContentItemType.AutoGenDesign);
    onClose();
  }

  const renderSheetBody = () => {
    switch (forItemType) {
      case ContentItemType.AutoGenDesign:
        return (
          <AddAutoGenDesignTemplateItem
            user={user}
            parentTemplate={parentTemplate}
            itemPosition={itemPosition}
            onAddComplete={onAddComplete}
            sourceDataView={sourceDataView}
            contentType={contentType}
          />
        );

      case ContentItemType.DriveFile:
        return (
          <AddDriveTemplateItem
            user={user}
            parentTemplate={parentTemplate}
            itemPosition={itemPosition}
            onAddComplete={onAddComplete}
            sourceDataView={sourceDataView}
            contentType={contentType}
          />
        );
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

          {!parentTemplate && (
            <div className="mb-4">
              <SelectMetadataSection
                sourceDataView={sourceDataView}
                setSourceDataView={setSourceDataView}
                contentType={contentType}
                setContentType={setContentType}
              />
            </div>
          )}
          {renderSheetBody()}
        </div>
      </SheetContent>
    </Sheet>
  );
}

const SelectMetadataSection = ({
  sourceDataView,
  setSourceDataView,
  contentType,
  setContentType,
}: {
  sourceDataView: SourceDataView;
  setSourceDataView: (value: SourceDataView) => void;
  contentType: ContentType;
  setContentType: (value: ContentType) => void;
}) => {
  return (
    <div>
      <p className="text-sm text-muted-foreground">
        Select the type of content and schedule you want to use for this template. You can then edit
        the template in the editor.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:gap-4">
        <InputSelect
          value={sourceDataView}
          className="w-[200px]"
          options={Object.keys(SourceDataView).map((key) => ({
            // @ts-ignore
            label: SourceDataView[key],
            // @ts-ignore
            value: SourceDataView[key],
          }))}
          onChange={(value) => {
            setSourceDataView(value);
          }}
          label="Schedule type"
        />
        <InputSelect
          value={contentType}
          className="w-[250px]"
          options={Object.keys(ContentType).map((key) => ({
            // @ts-ignore
            label: ContentType[key],
            // @ts-ignore
            value: ContentType[key],
          }))}
          onChange={(value) => {
            setContentType(value);
          }}
          label="Content type"
        />
      </div>
    </div>
  );
};
