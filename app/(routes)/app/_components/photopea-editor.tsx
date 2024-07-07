import { Spinner } from "@/src/components/common/loading-spinner";
import { ConfirmationDialog } from "@/src/components/dialogs/general-confirmation-dialog";
import { Button } from "@/src/components/ui/button";
import { usePhotopeaEditor } from "@/src/contexts/photopea-editor";
import { usePhotopeaHeadless } from "@/src/contexts/photopea-headless";
import { useGenerateDesign } from "@/src/hooks/use-generate-design";
import { exportCmd } from "@/src/libs/designs/photopea";
import { cn } from "@/src/utils";
import { useEffect, useRef, useState } from "react";

const photopeaEditorNamespace = "global-editor";

export default function PhotopeaEditor() {
  const { close: closeEditor, isOpen, initialize: initEditor, metadata, options, save, isSaving } = usePhotopeaEditor();
  const [isConfirmationDialogOpen, setIsConfirmationDialogOpen] = useState(false);
  const ref = useRef<HTMLIFrameElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const { initialize: initHeadless, clear: clearHeadless, sendRawPhotopeaCmd } = usePhotopeaHeadless();
  const { generateDesign, isLoading: isGeneratingDesign } = useGenerateDesign();

  const handleSave = async () => {
    // handleSave simply sends the export command to the photopea iframe. The actual saving of the design is done in the onFileExport callback.
    if (!ref.current) {
      return;
    }
    setIsExporting(true);

    const forcedRetryCount = 3;
    let retryCount = 0;
    while (retryCount < forcedRetryCount) {
      // We have to retry because the export command sometimes doesn't work on the first try. This is a hack.
      sendRawPhotopeaCmd(photopeaEditorNamespace, ref.current, exportCmd(photopeaEditorNamespace));
      retryCount++;
    }

    setIsConfirmationDialogOpen(false);
  };

  useEffect(() => {
    if (ref.current) {
      initEditor({
        ref,
      });

      initHeadless(photopeaEditorNamespace, {
        photopeaEl: ref.current,
        onFileExport: async (fileExport) => {
          if (!isExporting) {
            return;
          }
          if (fileExport && fileExport["psd"] && fileExport["jpg"]) {
            setIsExporting(false);
            save(fileExport);
          }
        },
      });
    }

    return () => {
      clearHeadless(photopeaEditorNamespace);
    };
  }, [ref.current, save, isExporting]);

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
      <div className="flex h-[80px] items-center gap-x-2 px-8">
        <div>
          <p className="mr-2 text-xl font-semibold text-secondary">{metadata.title}</p>
          <p className="text-sm text-neutral-400">
            Not seeing the design as expected? Please refresh the design. If the issue persists, please contact support.
          </p>
        </div>
        <div className="flex-1"></div>
        {metadata.template && (
          <Button
            className="w-[80px]"
            disabled={isSaving || isExporting || isGeneratingDesign}
            onClick={async () => {
              if (metadata.template) {
                generateDesign(metadata.template, true);
              }
            }}
          >
            {isGeneratingDesign ? <Spinner className="text-secondary" /> : "Refresh"}
          </Button>
        )}
        <Button
          className="w-[80px]"
          disabled={isSaving || isExporting}
          onClick={async () => {
            if (options?.onSaveConfirmationTitle) {
              setIsConfirmationDialogOpen(true);
            } else {
              handleSave();
            }
          }}
        >
          {isSaving || isExporting ? <Spinner className="text-secondary" /> : "Save"}
        </Button>
        <Button
          className="w-[80px]"
          variant="secondary"
          onClick={() => {
            closeEditor();
          }}
        >
          Exit
        </Button>
      </div>

      <iframe ref={ref} src={"https://www.photopea.com"} className="h-[calc(100vh-80px)] w-full"></iframe>
    </div>
  );
}
