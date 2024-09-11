"use client";
import { createContext, RefObject, useContext, useEffect, useState } from "react";
import { DesignExport } from "./photopea-headless";
import { SourceDataView } from "../consts/sources";

import { BLANK_DESIGN_TEMPLATES, FREE_DESIGN_TEMPLATES } from "../consts/storage";
import { flushSync } from "react-dom";
import { ContentType } from "../consts/content";
import { signUrl } from "../data/r2";

type FreeDesignTemplate = {
  jpg: ArrayBuffer;
  psd: ArrayBuffer;
  title: string;
};
export type PhotopeaEditorMetadata = {
  title: string;
  source_data_view: string;
  content_type: string;
};

type PhotopeaEditorOptions = {
  onSave?: (designExport: DesignExport, metadata: Partial<PhotopeaEditorMetadata>) => Promise<void>;
  onSaveConfirmationTitle?: string;
  isMetadataEditable?: boolean;
};
type PhotopeaEditorContextValue = {
  initialize: (args: { ref: RefObject<HTMLIFrameElement> }) => void;
  isOpen: boolean;
  close: () => void;
  save: (designExport: DesignExport, metadata: PhotopeaEditorMetadata) => Promise<void>;
  isSaving: boolean;
  open: (
    metadata: PhotopeaEditorMetadata,
    arrayBuffer: ArrayBuffer,
    options: PhotopeaEditorOptions,
  ) => void;
  options?: PhotopeaEditorOptions;
  metadata: PhotopeaEditorMetadata;
  isLoadingFreeDesignTemplates: boolean;
  freeDesignTemplates: {
    [key: string]: {
      [key: string]: FreeDesignTemplate[];
    };
  };
  blankDesignTemplates: {
    [key: string]: ArrayBuffer;
  };
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
    source_data_view: SourceDataView.Daily,
    content_type: ContentType.InstagramPost,
  });
  const [isLoadingFreeDesignTemplates, setIsLoadingFreeDesignTemplates] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [options, setOptions] = useState<PhotopeaEditorOptions>({
    isMetadataEditable: true,
  });
  const [freeDesignTemplates, setFreeDesignTemplates] = useState<{
    [key: string]: {
      [key: string]: FreeDesignTemplate[];
    };
  }>({
    [SourceDataView.Daily as string]: {
      [ContentType.InstagramPost]: [],
      [ContentType.InstagramStory]: [],
    },
    [SourceDataView.Weekly as string]: {
      [ContentType.InstagramPost]: [],
      [ContentType.InstagramStory]: [],
    },
  });
  const [blankDesignTemplates, setBlankDesignTemplates] = useState<{
    [key: string]: ArrayBuffer;
  }>({
    [ContentType.InstagramPost]: new ArrayBuffer(0),
    [ContentType.InstagramStory]: new ArrayBuffer(0),
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    const fetchFreeDesignTemplates = async () => {
      setIsLoadingFreeDesignTemplates(true);
      const downloads: Promise<{
        jpg: ArrayBuffer;
        psd: ArrayBuffer;
        scheduleRange: string;
        contentType: string;
        title: string;
      }>[] = [];

      for (const [scheduleRange, byContentType] of Object.entries(FREE_DESIGN_TEMPLATES)) {
        for (const [contentType, templates] of Object.entries(byContentType)) {
          for (const template of templates) {
            const download = new Promise<{
              scheduleRange: string;
              contentType: string;
              jpg: ArrayBuffer;
              psd: ArrayBuffer;
              title: string;
            }>(async (resolve) => {
              const [psdUrl, jpgUrl] = await Promise.all([
                signUrl("free-design-templates", `${contentType}/${template.fileName}.psd`),
                signUrl("free-design-templates", `${contentType}/${template.fileName}.jpg`),
              ]);
              const [psd, jpg] = await Promise.all([fetch(psdUrl), fetch(jpgUrl)]);
              const [psdArrayBuffer, jpgArrayBuffer] = await Promise.all([
                psd.arrayBuffer(),
                jpg.arrayBuffer(),
              ]);
              resolve({
                scheduleRange,
                contentType,
                jpg: jpgArrayBuffer,
                psd: psdArrayBuffer,
                title: template.title,
              });
            });
            downloads.push(download);
          }
        }
      }
      const downloaded = await Promise.all(downloads);
      const designTemplates: {
        [key: string]: {
          [key: string]: FreeDesignTemplate[];
        };
      } = {};
      for (const download of downloaded) {
        if (!designTemplates[download.scheduleRange]) {
          designTemplates[download.scheduleRange] = {};
        }
        if (!designTemplates[download.scheduleRange][download.contentType]) {
          designTemplates[download.scheduleRange][download.contentType] = [];
        }
        designTemplates[download.scheduleRange][download.contentType].push({
          title: download.title,
          jpg: download.jpg,
          psd: download.psd,
        });
      }

      const blankDesignDownloads: Promise<{
        psd: ArrayBuffer;
        contentType: string;
      }>[] = [];
      const blankDesigns: {
        [key: string]: ArrayBuffer;
      } = {};
      for (const [contentType, fileName] of Object.entries(BLANK_DESIGN_TEMPLATES)) {
        const download = new Promise<{
          contentType: string;
          psd: ArrayBuffer;
        }>(async (resolve) => {
          const psdUrl = await signUrl("free-design-templates", `${contentType}/${fileName}.psd`);
          const psd = await fetch(psdUrl);
          const psdArrayBuffer = await psd.arrayBuffer();
          resolve({ contentType, psd: psdArrayBuffer });
        });
        blankDesignDownloads.push(download);
      }
      const blankDesignsDownloaded = await Promise.all(blankDesignDownloads);
      for (const blankDesign of blankDesignsDownloaded) {
        blankDesigns[blankDesign.contentType] = blankDesign.psd;
      }

      setFreeDesignTemplates(designTemplates);
      setBlankDesignTemplates(blankDesigns);
      setIsLoadingFreeDesignTemplates(false);
    };
    fetchFreeDesignTemplates();
  }, []);

  const open = (
    metadata: PhotopeaEditorMetadata,
    arrayBuffer: ArrayBuffer,
    options?: PhotopeaEditorOptions,
  ) => {
    flushSync(() => {
      setMetadata(metadata);
    });
    if (ref?.current?.contentWindow) {
      ref.current.contentWindow.postMessage(arrayBuffer, "*");
    }
    setIsOpen(true);
    setOptions((prev) => ({
      ...prev,
      ...options,
    }));
  };

  const save = async (designExport: DesignExport, metadata: Partial<PhotopeaEditorMetadata>) => {
    try {
      setIsSaving(true);
      await options.onSave?.(designExport, metadata);
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
    setOptions({});
    setIsOpen(false);
  };

  const initialize = ({ ref }: { ref: RefObject<HTMLIFrameElement> }) => {
    setRef(ref);
  };

  return (
    <PhotopeaEditorContext.Provider
      value={{
        initialize,
        isLoadingFreeDesignTemplates,
        isOpen,
        options,
        close,
        open,
        save,
        isSaving,
        metadata,
        freeDesignTemplates,
        blankDesignTemplates,
      }}
    >
      {children}
    </PhotopeaEditorContext.Provider>
  );
}

export { usePhotopeaEditor, PhotopeaEditorProvider };
export default PhotopeaEditorContext;
