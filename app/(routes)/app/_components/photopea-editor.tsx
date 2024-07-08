import { Spinner } from "@/src/components/common/loading-spinner";
import { ConfirmationDialog } from "@/src/components/dialogs/general-confirmation-dialog";
import { Button } from "@/src/components/ui/button";
import InputSelect from "@/src/components/ui/input/select";
import InputText from "@/src/components/ui/input/text";
import { SourceDataView } from "@/src/consts/sources";
import { usePhotopeaEditor } from "@/src/contexts/photopea-editor";
import { usePhotopeaHeadless } from "@/src/contexts/photopea-headless";
import { exportCmd } from "@/src/libs/designs/photopea";
import { cn } from "@/src/utils";
import { CheckIcon, PencilIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";

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
  const [pendingTitle, setPendingTitle] = useState(metadata.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const [sourceDataView, setSourceDataView] = useState(metadata.source_data_view);

  useEffect(() => {
    setTitle(metadata.title);
    setPendingTitle(metadata.title);
    setSourceDataView(metadata.source_data_view);
  }, [metadata.title, metadata.source_data_view]);

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
            await save(fileExport, { title, source_data_view: sourceDataView });
          }
        },
      });
    }

    return () => {
      clearHeadless(photopeaEditorNamespace);
    };
  }, [ref.current, save, isExporting, title, metadata.title]);

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
      <div className="flex h-[100px] items-center gap-x-2 px-8 py-2">
        <div className="flex h-[50px] items-center gap-2">
          {isEditingTitle ? (
            <div className="flex items-center gap-x-1">
              <InputText
                className="mr-2 w-[300px]"
                value={pendingTitle}
                onChange={(e) => {
                  setPendingTitle(e.target.value);
                }}
              />
              <CheckIcon
                className="h-8 w-8 cursor-pointer rounded-full p-2 text-green-600 hover:bg-secondary-foreground"
                onClick={() => {
                  setTitle(pendingTitle);
                  setIsEditingTitle(false);
                }}
              />

              <XMarkIcon
                className="h-8 w-8 cursor-pointer rounded-full p-2 text-destructive hover:bg-secondary-foreground"
                onClick={() => {
                  setTitle(title);
                  setIsEditingTitle(false);
                }}
              >
                Cancel
              </XMarkIcon>
            </div>
          ) : (
            <p className="mr-2 text-xl font-semibold text-secondary">{title}</p>
          )}
          {!isEditingTitle && options?.isMetadataEditable && (
            <PencilIcon
              className="h-8 w-8 cursor-pointer rounded-full p-2 text-secondary hover:bg-secondary-foreground"
              onClick={() => {
                setIsEditingTitle(true);
              }}
            />
          )}
        </div>
        <div className="ml-12 flex flex-col justify-start gap-2">
          {options?.isMetadataEditable && (
            <>
              <p className="text-xs text-secondary">
                What schedule range does this template work with?
              </p>
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

      <iframe
        ref={ref}
        src={"https://www.photopea.com"}
        className="h-[calc(100vh-100px)] w-full"
      ></iframe>
    </div>
  );
}
