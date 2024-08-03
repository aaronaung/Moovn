import { ConfirmationDialog } from "@/src/components/dialogs/general-confirmation-dialog";
import InputSelect from "@/src/components/ui/input/select";
import { toast } from "@/src/components/ui/use-toast";
import { SourceDataView } from "@/src/consts/sources";
import { usePhotopeaEditor } from "@/src/contexts/photopea-editor";
import { usePhotopeaHeadless } from "@/src/contexts/photopea-headless";
import { exportCmd } from "@/src/libs/designs/photopea";
import { cn } from "@/src/utils";
import { useEffect, useRef, useState } from "react";
import EditorHeader, { EDITOR_HEADER_HEIGHT } from "./editor-header";
import { ContentType } from "@/src/consts/content";

const photopeaEditorNamespace = "global-editor";

export default function PhotopeaEditor() {
  const {
    close: closeEditor,
    isOpen,
    initialize: initEditor,
    metadata,
    options,
    save,
    isSaving,
    freeDesignTemplates,
  } = usePhotopeaEditor();
  const [isConfirmationDialogOpen, setIsConfirmationDialogOpen] = useState(false);
  const ref = useRef<HTMLIFrameElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const {
    initialize: initHeadless,
    clear: clearHeadless,
    sendRawPhotopeaCmd,
  } = usePhotopeaHeadless();

  const [title, setTitle] = useState(metadata.title);
  const [sourceDataView, setSourceDataView] = useState(metadata.source_data_view);
  const [contentType, setContentType] = useState(metadata.content_type);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setTitle(metadata.title);
    setSourceDataView(metadata.source_data_view);
    setContentType(metadata.content_type);
  }, [metadata.title, metadata.source_data_view, metadata.content_type]);

  const handleSave = async () => {
    // handleSave simply sends the export command to the photopea iframe. The actual saving of the design is done in the onDesignExport callback.
    if (!ref.current) {
      return;
    }
    setIsExporting(true);
    setSaveTimeout(
      setTimeout(() => {
        toast({
          variant: "destructive",
          title: "Failed to save design",
          description:
            "Make sure the design isn't empty. If this persists, please contact support.",
        });
        setIsExporting(false);
      }, 10000),
    );
    sendRawPhotopeaCmd(photopeaEditorNamespace, ref.current, exportCmd(photopeaEditorNamespace));
    setIsConfirmationDialogOpen(false);
  };

  useEffect(() => {
    if (ref.current) {
      initEditor({
        ref,
      });

      initHeadless(photopeaEditorNamespace, ref.current, {
        onDesignExport: async (designExport) => {
          if (!isExporting) {
            return;
          }
          if (designExport && designExport["psd"] && designExport["jpg"]) {
            setIsExporting(false);
            if (saveTimeout) {
              clearTimeout(saveTimeout);
              setSaveTimeout(null);
            }
            await save(designExport, {
              title,
              source_data_view: sourceDataView,
              content_type: contentType,
            });
          }
        },
      });
    }

    return () => {
      clearHeadless(photopeaEditorNamespace);
    };
  }, [
    ref.current,
    save,
    isExporting,
    setIsExporting,
    title,
    metadata.title,
    sourceDataView,
    contentType,
  ]);

  return (
    <div className={cn("flex flex-col  bg-neutral-800", !isOpen && "hidden")}>
      {options?.onSaveConfirmationTitle && (
        <ConfirmationDialog
          isOpen={isConfirmationDialogOpen}
          onClose={() => setIsConfirmationDialogOpen(false)}
          title={options.onSaveConfirmationTitle}
          onConfirm={handleSave}
          isConfirming={isSaving || isExporting}
        />
      )}

      <EditorHeader
        onClose={closeEditor}
        onSave={(title: string) => {
          if (options?.onSaveConfirmationTitle) {
            setIsConfirmationDialogOpen(true);
          } else {
            setTitle(title);
            handleSave();
          }
        }}
        isSaving={isSaving || isExporting}
        initialTitle={title}
        isTitleEditable={options?.isMetadataEditable}
      />

      <div className={`flex`}>
        <div
          className={`w-[350px] border-t-2 border-neutral-700 bg-neutral-800 px-4`}
          style={{
            height: `calc(100vh - ${EDITOR_HEADER_HEIGHT}px)`,
          }}
        >
          <div className="my-4 flex flex-col justify-start gap-2">
            {options?.isMetadataEditable && (
              <>
                <p className="text-sm text-white">Select a schedule type</p>
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
                />
              </>
            )}
          </div>
          <div className="my-4 flex flex-col justify-start gap-2">
            {options?.isMetadataEditable && (
              <>
                <p className="text-sm text-white">Select a content type</p>
                <InputSelect
                  value={contentType}
                  className="w-[200px]"
                  options={Object.keys(ContentType).map((key) => ({
                    // @ts-ignore
                    label: ContentType[key],
                    // @ts-ignore
                    value: ContentType[key],
                  }))}
                  onChange={(value) => {
                    setContentType(value);
                  }}
                />
              </>
            )}
          </div>
          <p className="mt-8 text-sm text-white">Get started with sample templates</p>
          <div className="mt-4 flex flex-wrap gap-4">
            {(freeDesignTemplates[sourceDataView][contentType] || []).length === 0 && (
              <p className="text-xs text-muted-foreground">
                Sample templates for this schedule type coming soon!
              </p>
            )}
            {(freeDesignTemplates[sourceDataView][contentType] || []).map((template, index) => (
              <img
                key={index}
                src={`data:image/jpeg;base64,${Buffer.from(template.jpg).toString("base64")}`}
                className="h-[170px] w-[170px] cursor-pointer rounded-md object-cover hover:border-2 hover:border-white"
                onClick={() => {
                  if (ref.current) {
                    sendRawPhotopeaCmd(photopeaEditorNamespace, ref.current, template.psd);
                  }
                }}
                alt={`Template ${index}`}
              />
            ))}
          </div>
        </div>
        <iframe
          ref={ref}
          src={`https://www.photopea.com#${JSON.stringify({
            files: [],
            environment: {
              intro: false,
            },
          })}`}
          style={{
            height: `calc(100vh - ${EDITOR_HEADER_HEIGHT}px)`,
          }}
          className={`w-full`}
        />
      </div>
    </div>
  );
}
