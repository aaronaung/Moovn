"use client";
import { createContext, RefObject, useContext, useEffect, useState } from "react";
import { DesignExport } from "./photopea-headless";
import { SourceDataView } from "../consts/sources";
import { signUrl } from "../libs/storage";
import { BUCKETS, FREE_DESIGN_TEMPLATES } from "../consts/storage";
import { supaClientComponentClient } from "../data/clients/browser";
import { flushSync } from "react-dom";
import { ContentType } from "../consts/content";

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
  freeDesignTemplates: {
    [key: string]: {
      [key: string]: { jpg: ArrayBuffer; psd: ArrayBuffer }[];
    };
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
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [options, setOptions] = useState<PhotopeaEditorOptions>({
    isMetadataEditable: true,
  });
  const [freeDesignTemplates, setFreeDesignTemplates] = useState<{
    [key: string]: {
      [key: string]: { jpg: ArrayBuffer; psd: ArrayBuffer }[];
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
    [SourceDataView.Monthly as string]: {
      [ContentType.InstagramPost]: [],
      [ContentType.InstagramStory]: [],
    },
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    const fetchFreeDesignTemplates = async () => {
      const downloads: Promise<{
        jpg: ArrayBuffer;
        psd: ArrayBuffer;
        scheduleRange: string;
        contentType: string;
      }>[] = [];
      for (const [scheduleRange, byContentType] of Object.entries(FREE_DESIGN_TEMPLATES)) {
        for (const [contentType, fileNames] of Object.entries(byContentType)) {
          for (const fileName of fileNames) {
            const download = new Promise<{
              scheduleRange: string;
              contentType: string;
              jpg: ArrayBuffer;
              psd: ArrayBuffer;
            }>(async (resolve) => {
              const [psdUrl, jpgUrl] = await Promise.all([
                signUrl({
                  bucket: BUCKETS.freeDesignTemplates,
                  objectPath: `${contentType}/${fileName}.psd`,
                  client: supaClientComponentClient,
                }),
                signUrl({
                  bucket: BUCKETS.freeDesignTemplates,
                  objectPath: `${contentType}/${fileName}.jpg`,
                  client: supaClientComponentClient,
                }),
              ]);
              const [psd, jpg] = await Promise.all([fetch(psdUrl), fetch(jpgUrl)]);
              const [psdArrayBuffer, jpgArrayBuffer] = await Promise.all([
                psd.arrayBuffer(),
                jpg.arrayBuffer(),
              ]);
              resolve({ scheduleRange, contentType, jpg: jpgArrayBuffer, psd: psdArrayBuffer });
            });
            downloads.push(download);
          }
        }
      }
      const downloaded = await Promise.all(downloads);
      const designTemplates: {
        [key: string]: {
          [key: string]: { jpg: ArrayBuffer; psd: ArrayBuffer }[];
        };
      } = {};
      for (const download of downloaded) {
        if (!designTemplates[download.scheduleRange]) {
          designTemplates[download.scheduleRange] = {};
        }
        if (!designTemplates[download.scheduleRange][download.contentType]) {
          designTemplates[download.scheduleRange][download.contentType] = [];
        }
        designTemplates[download.scheduleRange][download.contentType].push(download);
      }
      console.log({ designTemplates });
      setFreeDesignTemplates(designTemplates);
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
        isOpen,
        options,
        close,
        open,
        save,
        isSaving,
        metadata,
        freeDesignTemplates,
      }}
    >
      {children}
    </PhotopeaEditorContext.Provider>
  );
}

export { usePhotopeaEditor, PhotopeaEditorProvider };
export default PhotopeaEditorContext;
