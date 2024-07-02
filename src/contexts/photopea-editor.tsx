"use client";
import { createContext, useContext, useState } from "react";

type PhotopeaEditorContextValue = {
  src: string | null;
  setSrc: (src: string | null) => void;
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
  const [src, setSrc] = useState<string | null>(null);

  const value = {
    src,
    setSrc,
  };

  return <PhotopeaEditorContext.Provider value={value}>{children}</PhotopeaEditorContext.Provider>;
}

export { usePhotopeaEditor, PhotopeaEditorProvider };
export default PhotopeaEditorContext;
