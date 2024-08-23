"use client";
import _ from "lodash";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  checkLayerTranslatesComplete,
  checkLayerUpdatesComplete,
  exportCmd,
  InstagramTag,
  translateLayersCmd,
  updateLayersCmd,
} from "../libs/designs/photopea";
import { DesignGenSteps } from "../libs/designs/photoshop-v2";

export type DesignExport = {
  jpg: ArrayBuffer | null;
  psd: ArrayBuffer | null;
  instagramTags: InstagramTag[];
};

type PhotopeaHeadlessContextValue = {
  sendRawPhotopeaCmd: (
    namespace: string,
    photopeaEl: HTMLIFrameElement,
    cmd: string | ArrayBuffer,
  ) => void;
  initialize: (
    namespace: string,
    photopeaEl: HTMLIFrameElement,
    options: {
      initialData?: ArrayBuffer;
      designGenSteps?: DesignGenSteps;
      onTimeout?: () => void;
      onDesignExport?: (args: DesignExport | null) => void;
      timeout?: number;
    },
  ) => void;
  clear: (namespace: string) => void;
};

const PhotopeaHeadlessContext = createContext<PhotopeaHeadlessContextValue | null>(null);

function usePhotopeaHeadless() {
  const context = useContext(PhotopeaHeadlessContext);
  if (!context) {
    throw new Error(`usePhotopeaHeadless must be used within a PhotopeaHeadlessProvider`);
  }
  return context;
}

const LAYER_CHECK_INTERVAL = 500; // ms
const DEFAULT_TIMEOUT = 15_000;
const MAX_IN_PROGRESS = 5;

function PhotopeaHeadlessProvider({ children }: { children: React.ReactNode }) {
  // Every state here is a map of namespace to some value.

  // Internally managed
  const pollIntervalMapRef = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const [exportQueue, setExportQueue] = useState<ArrayBuffer[]>([]);
  const [exportMetadataQueue, setExportMetadataQueue] = useState<
    { namespace: string; format: string }[]
  >([]);
  const [photopeaMap, setPhotopeaMap] = useState<{ [key: string]: HTMLIFrameElement }>({});
  const [designGenStepsMap, setDesignGenStepsMap] = useState<{ [key: string]: DesignGenSteps }>({});
  const [instagramTagsMap, setInstagramTagsMap] = useState<{
    [key: string]: InstagramTag[];
  }>({});

  // Exposed to caller
  const [onDesignExportMap, setOnDesignExportMap] = useState<{
    [key: string]: (args: DesignExport | null) => void;
  }>({});

  const processEventFromPhotopea = useCallback(
    async (e: MessageEvent) => {
      if (_.isString(e.data)) {
        if (e.data.startsWith("layer_updates_complete")) {
          // layer_updates_complete:namespace-123
          const [_, namespace] = e.data.split(":");
          if (pollIntervalMapRef.current[namespace]) {
            clearIntervalForNamespace(namespace);
          }
          if (photopeaMap[namespace]) {
            sendRawPhotopeaCmd(
              namespace,
              photopeaMap[namespace],
              translateLayersCmd(namespace, designGenStepsMap[namespace].layerTranslates),
            );
            setIntervalForNamespace(
              namespace,
              () => {
                sendRawPhotopeaCmd(
                  namespace,
                  photopeaMap[namespace],
                  checkLayerTranslatesComplete(
                    namespace,
                    designGenStepsMap[namespace].layerTranslates,
                  ),
                );
              },
              LAYER_CHECK_INTERVAL,
            );
          }
        }
        if (e.data.startsWith("layer_translates_complete")) {
          // layer_translates_complete:namespace-123
          console.log(e.data);
          const [_, namespace] = e.data.split(":");
          if (pollIntervalMapRef.current[namespace]) {
            clearIntervalForNamespace(namespace);
          }
          if (photopeaMap[namespace]) {
            sendRawPhotopeaCmd(namespace, photopeaMap[namespace], exportCmd(namespace));
          }
        }
        if (e.data.startsWith("export_file")) {
          // export_file:namespace-123:jpg
          const [_, namespace, format] = e.data.split(":");
          setExportMetadataQueue((prev) => [...prev, { namespace, format }]);
        }
        if (e.data.startsWith("instagram_tag_positions")) {
          const [_, namespace, b64] = e.data.split(":");
          const instagramTags: InstagramTag[] = JSON.parse(atob(b64));
          setInstagramTagsMap((prev) => ({ ...prev, [namespace]: instagramTags }));
        }
      }
      if (e.data instanceof ArrayBuffer) {
        setExportQueue((prev) => [...prev, e.data]);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      photopeaMap,
      designGenStepsMap,
      onDesignExportMap,
      pollIntervalMapRef,
      exportQueue,
      exportMetadataQueue,
    ],
  );

  useEffect(() => {
    return () => {
      Object.keys(pollIntervalMapRef.current).forEach(clearIntervalForNamespace);
    };
  }, []);

  useEffect(() => {
    window.addEventListener("message", processEventFromPhotopea);
    return () => {
      window.removeEventListener("message", processEventFromPhotopea);
    };
  }, [processEventFromPhotopea]);

  useEffect(() => {
    if (exportMetadataQueue.length > 0 && exportQueue.length > 0) {
      for (const exportMetadata of exportMetadataQueue) {
        const mostRecentExport = getMostRecentExport(exportMetadata.namespace);
        if (
          mostRecentExport?.jpg &&
          mostRecentExport?.psd &&
          onDesignExportMap[exportMetadata.namespace]
        ) {
          onDesignExportMap[exportMetadata.namespace](mostRecentExport);
          clear(exportMetadata.namespace);
          return;
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exportQueue, exportMetadataQueue, onDesignExportMap]);

  const setIntervalForNamespace = (namespace: string, callback: () => void, delay: number) => {
    clearIntervalForNamespace(namespace);
    console.log(`Setting poll interval for namespace: ${namespace}`);

    pollIntervalMapRef.current[namespace] = setInterval(callback, delay);
  };

  const clearIntervalForNamespace = (namespace: string) => {
    if (pollIntervalMapRef.current[namespace]) {
      console.log(`Clearing poll interval for namespace: ${namespace}`);
      clearInterval(pollIntervalMapRef.current[namespace]);
      delete pollIntervalMapRef.current[namespace];
    }
  };

  const sendRawPhotopeaCmd = async (
    namespace: string,
    photopeaEl: HTMLIFrameElement,
    cmd: string | ArrayBuffer,
  ) => {
    const ppWindow = photopeaEl.contentWindow;
    if (!ppWindow) {
      // console.log("photopea command rejected because window is not ready", namespace, cmd);
      // This usually happens when an interval is still running after the iframe has been removed.
      clearIntervalForNamespace(namespace);
      return;
    }
    ppWindow.postMessage(cmd, "*");
  };

  const attachOnDesignExportListener = (
    namespace: string,
    callback?: (args: DesignExport | null) => void,
  ) => {
    if (callback) {
      setOnDesignExportMap((prev) => ({
        ...prev,
        [namespace]: _.debounce(callback, 100),
      }));
    }
  };

  const getMostRecentExport = (namespace: string): DesignExport | null => {
    let mostRecentJpgIndex = -1;
    let mostRecentPsdIndex = -1;
    for (let i = 0; i < exportMetadataQueue.length; i++) {
      if (exportMetadataQueue[i].namespace === namespace) {
        if (exportMetadataQueue[i].format === "jpg") {
          mostRecentJpgIndex = i;
        } else if (exportMetadataQueue[i].format === "psd") {
          mostRecentPsdIndex = i;
        }
      }
    }
    return {
      jpg: mostRecentJpgIndex === -1 ? null : exportQueue[mostRecentJpgIndex],
      psd: mostRecentPsdIndex === -1 ? null : exportQueue[mostRecentPsdIndex],
      instagramTags: instagramTagsMap[namespace] || [],
    };
  };

  const deleteNamespace = (namespace: string) => {
    return (prev: any) => {
      const copy = { ...prev };
      delete copy[namespace];
      return copy;
    };
  };
  const clear = (namespace: string) => {
    setPhotopeaMap(deleteNamespace(namespace));
    setInstagramTagsMap(deleteNamespace(namespace));
    setDesignGenStepsMap(deleteNamespace(namespace));
    setOnDesignExportMap(deleteNamespace(namespace));
    setExportMetadataQueue(exportMetadataQueue.filter((e) => e.namespace !== namespace));
    setExportQueue(exportQueue.filter((e, i) => exportMetadataQueue[i]?.namespace !== namespace));
    clearIntervalForNamespace(namespace);
  };

  const initialize = async (
    namespace: string,
    photopeaEl: HTMLIFrameElement,
    {
      initialData,
      designGenSteps,
      onDesignExport,
      onTimeout,
      timeout = DEFAULT_TIMEOUT,
    }: {
      initialData?: ArrayBuffer;
      designGenSteps?: DesignGenSteps;
      onTimeout?: () => void;
      onDesignExport?: (args: DesignExport | null) => void;
      timeout?: number;
    },
  ) => {
    // This ensures that we always starts with a clean slate.
    clear(namespace);

    setPhotopeaMap((prev) => ({ ...prev, [namespace]: photopeaEl }));
    if (designGenSteps) {
      setDesignGenStepsMap((prev) => ({ ...prev, [namespace]: designGenSteps }));
    }
    attachOnDesignExportListener(namespace, onDesignExport);

    if (initialData) {
      // Load the initial data.
      photopeaEl.onload = async () => {
        sendRawPhotopeaCmd(namespace, photopeaEl, initialData);

        if (designGenSteps) {
          // Start design gen
          sendRawPhotopeaCmd(namespace, photopeaEl, updateLayersCmd(designGenSteps.layerUpdates)); // Start the layer updates complete check.

          setIntervalForNamespace(
            namespace,
            () => {
              sendRawPhotopeaCmd(
                namespace,
                photopeaEl,
                checkLayerUpdatesComplete(namespace, designGenSteps),
              );
            },
            LAYER_CHECK_INTERVAL,
          );
        } else {
          console.log("no design gen steps, exporting design", namespace);
          // No design gen steps, just export the design.
          sendRawPhotopeaCmd(namespace, photopeaEl, exportCmd(namespace));
        }
      };
    }

    setTimeout(() => {
      // Design gen timeout has been reached.
      clear(namespace);
      onTimeout?.();
    }, timeout);
  };

  return (
    <PhotopeaHeadlessContext.Provider
      value={{
        initialize,
        sendRawPhotopeaCmd,
        clear,
      }}
    >
      {children}
    </PhotopeaHeadlessContext.Provider>
  );
}

export { PhotopeaHeadlessProvider, usePhotopeaHeadless };
export default PhotopeaHeadlessContext;
