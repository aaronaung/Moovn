import { ConfirmationDialog } from "@/src/components/dialogs/general-confirmation-dialog";
import { Button } from "@/src/components/ui/button";
import { usePhotopeaEditor } from "@/src/contexts/photopea-editor";
import { usePhotopeaHeadless } from "@/src/contexts/photopea-headless";
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

  const handleSave = async () => {
    setIsExporting(true);

    const forcedRetryCount = 3;
    let retryCount = 0;
    while (retryCount < forcedRetryCount) {
      // We have to retry because the export command sometimes doesn't work on the first try. This is a hack.
      sendRawPhotopeaCmd(photopeaEditorNamespace, exportCmd(photopeaEditorNamespace));
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
        ref,
        onFileExport: async (fileExport) => {
          if (!isExporting) {
            return;
          }
          if (fileExport && fileExport["psd"] && fileExport["jpg"]) {
            setIsExporting(false);
            save(fileExport);
          }
        },
        onReady: () => {
          console.log("photopea editor ready");
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
            Our design editing tool is powered by Photopea. You can access this tool separately at{" "}
            <a target="_blank" className="hover:text-primary hover:underline" href="https://www.photopea.com.">
              https://www.photopea.com.
            </a>
          </p>
        </div>
        <div className="flex-1"></div>
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
          Save
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
