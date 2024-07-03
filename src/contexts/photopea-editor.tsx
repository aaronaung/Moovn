"use client";
import { createContext, RefObject, useContext, useState } from "react";
import { FileExport } from "./photopea-headless";

type PhotopeaEditorMetadata = {
  title: string;
};

type PhotopeaEditorOptions = {
  onSave?: (fileExport: FileExport) => Promise<void>;
  onSaveConfirmationTitle?: string;
};
type PhotopeaEditorContextValue = {
  initialize: (args: { ref: RefObject<HTMLIFrameElement> }) => void;
  isOpen: boolean;
  close: () => void;
  save: (fileExport: FileExport) => Promise<void>;
  isSaving: boolean;
  open: (metadata: PhotopeaEditorMetadata, arrayBuffer: ArrayBuffer, options: PhotopeaEditorOptions) => void;
  options?: PhotopeaEditorOptions;
  metadata: PhotopeaEditorMetadata;
};

const PhotopeaEditorContext = createContext<PhotopeaEditorContextValue | null>(null);

function usePhotopeaEditor() {
  const context = useContext(PhotopeaEditorContext);
  if (!context) {
    throw new Error(`usePhotopeaEditor must be used within a PhotopeaEditorProvider`);
  }
  return context;
}

function PhotopeaEditorProvider({ children }: { children: React.ReactNode }) {
  const [ref, setRef] = useState<RefObject<HTMLIFrameElement> | null>(null);
  const [metadata, setMetadata] = useState<PhotopeaEditorMetadata>({
    title: "Untitled",
  });
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [options, setOptions] = useState<PhotopeaEditorOptions>({});
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const open = (metadata: PhotopeaEditorMetadata, arrayBuffer: ArrayBuffer, options?: PhotopeaEditorOptions) => {
    setMetadata(metadata);
    if (ref?.current?.contentWindow) {
      ref.current.contentWindow.postMessage(arrayBuffer, "*");
    }
    setIsOpen(true);
    setOptions(options || {});
  };

  const save = async (fileExport: FileExport) => {
    try {
      setIsSaving(true);
      await options.onSave?.(fileExport);
      // close();
    } catch (err) {
      console.error("failed to save editor changes", err);
    } finally {
      setIsSaving(false);
    }
  };

  const close = () => {
    if (ref?.current?.contentWindow) {
      ref.current.contentWindow.postMessage("app.activeDocument.close()", "*");
    }
    setIsOpen(false);
  };

  const initialize = ({ ref }: { ref: RefObject<HTMLIFrameElement> }) => {
    setRef(ref);
  };

  return (
    <PhotopeaEditorContext.Provider value={{ initialize, isOpen, options, close, open, save, isSaving, metadata }}>
      {children}
    </PhotopeaEditorContext.Provider>
  );
}

export { usePhotopeaEditor, PhotopeaEditorProvider };
export default PhotopeaEditorContext;
