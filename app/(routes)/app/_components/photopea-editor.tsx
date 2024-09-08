import { ConfirmationDialog } from "@/src/components/dialogs/general-confirmation-dialog";
import { toast } from "@/src/components/ui/use-toast";
import { usePhotopeaEditor } from "@/src/contexts/photopea-editor";
import { usePhotopeaHeadless } from "@/src/contexts/photopea-headless";
import { exportCmd } from "@/src/libs/designs/photopea/utils";
import { cn } from "@/src/utils";
import { useEffect, useRef, useState } from "react";
import EditorHeader, { EDITOR_HEADER_HEIGHT } from "./editor-header";

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
    <div className={cn("flex h-screen flex-col bg-neutral-800", !isOpen && "hidden")}>
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
        contentType={contentType}
        sourceDataView={sourceDataView}
      />

      <div
        className={`flex`}
        style={{
          height: `calc(100vh - ${EDITOR_HEADER_HEIGHT}px)`,
        }}
      >
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
