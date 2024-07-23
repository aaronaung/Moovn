"use client";
import _ from "lodash";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  checkLayerUpdatesComplete,
  exportCmd,
  translateLayersCmd,
  updateLayersCmd,
} from "../libs/designs/photopea";
import { DesignGenSteps } from "../libs/designs/photoshop-v2";

export type FileExport = { [key: string]: ArrayBuffer | null }; // { jpg: ArrayBuffer, psd: ArrayBuffer }

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
      onFileExport?: (args: FileExport | null) => void;
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

const CHECK_LAYER_UPDATES_COMPLETE_INTERVAL = 500; // Gives more resolution.
const DEFAULT_TIMEOUT = 15_000;

function PhotopeaHeadlessProvider({ children }: { children: React.ReactNode }) {
  // Every state here is a map of namespace to some value.

  // Internally managed
  const [pollIntervalMap, setPollIntervalMap] = useState<{ [key: string]: NodeJS.Timeout }>({});
  const [exportQueue, setExportQueue] = useState<ArrayBuffer[]>([]);
  const [exportMetadataQueue, setExportMetadataQueue] = useState<
    { namespace: string; format: string }[]
  >([]);
  const [photopeaMap, setPhotopeaMap] = useState<{ [key: string]: HTMLIFrameElement }>({});
  const [designGenStepsMap, setDesignGenStepsMap] = useState<{ [key: string]: DesignGenSteps }>({});

  // Exposed to caller
  const [onFileExportMap, setOnFileExportMap] = useState<{
    [key: string]: (args: FileExport | null) => void;
  }>({});

  const processEventFromPhotopea = useCallback(
    async (e: MessageEvent) => {
      if (_.isString(e.data)) {
        if (e.data.startsWith("layer_updates_complete")) {
          // layer_updates_complete:namespace-123:true
          const [_, namespace] = e.data.split(":");
          if (photopeaMap[namespace]) {
            sendRawPhotopeaCmd(
              namespace,
              photopeaMap[namespace],
              translateLayersCmd(designGenStepsMap[namespace].layerTranslates),
            );
            if (pollIntervalMap[namespace]) {
              clearInterval(pollIntervalMap[namespace]);
            }
            // layer moves should be relatively fast
            setTimeout(() => {
              sendRawPhotopeaCmd(namespace, photopeaMap[namespace], exportCmd(namespace));
            }, 250);
          }
        }
        if (e.data.startsWith("export_file")) {
          // export_file:namespace-123:jpg
          const [_, namespace, format] = e.data.split(":");
          setExportMetadataQueue((prev) => [...prev, { namespace, format }]);
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
      onFileExportMap,
      pollIntervalMap,
      exportQueue,
      exportMetadataQueue,
    ],
  );

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
          onFileExportMap[exportMetadata.namespace]
        ) {
          onFileExportMap[exportMetadata.namespace](mostRecentExport);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exportQueue, exportMetadataQueue, onFileExportMap]);

  const sendRawPhotopeaCmd = async (
    namespace: string,
    photopeaEl: HTMLIFrameElement,
    cmd: string | ArrayBuffer,
  ) => {
    const ppWindow = photopeaEl.contentWindow;
    if (!ppWindow) {
      console.log("photopea command rejected because window is not ready", namespace, cmd);
      // This usually happens when an interval is still running after the iframe has been removed.
      clearInterval(pollIntervalMap[namespace]);
      return;
    }
    ppWindow.postMessage(cmd, "*");
  };

  const attachOnFileExportListener = (
    namespace: string,
    callback?: (args: FileExport | null) => void,
  ) => {
    if (callback) {
      setOnFileExportMap((prev) => ({
        ...prev,
        [namespace]: _.debounce(callback, 100),
      }));
    }
  };

  const getMostRecentExport = (namespace: string): FileExport | null => {
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
    setDesignGenStepsMap(deleteNamespace(namespace));
    setOnFileExportMap(deleteNamespace(namespace));
    setExportMetadataQueue(exportMetadataQueue.filter((e) => e.namespace !== namespace));
    setExportQueue(exportQueue.filter((e, i) => exportMetadataQueue[i]?.namespace !== namespace));

    if (pollIntervalMap[namespace]) {
      console.log("clearing interval for namespace", namespace, pollIntervalMap);
      clearInterval(pollIntervalMap[namespace]);
    }
    setPollIntervalMap(deleteNamespace(namespace));
  };

  const initialize = (
    namespace: string,
    photopeaEl: HTMLIFrameElement,
    {
      initialData,
      designGenSteps,
      onFileExport,
      timeout = DEFAULT_TIMEOUT,
    }: {
      initialData?: ArrayBuffer;
      designGenSteps?: DesignGenSteps;
      onFileExport?: (args: FileExport | null) => void;
      timeout?: number;
    },
  ) => {
    // This ensures that we always starts with a clean slate.
    clear(namespace);

    setPhotopeaMap((prev) => ({ ...prev, [namespace]: photopeaEl }));
    if (designGenSteps) {
      setDesignGenStepsMap((prev) => ({ ...prev, [namespace]: designGenSteps }));
    }
    attachOnFileExportListener(namespace, onFileExport);

    if (initialData) {
      // Load the initial data.
      photopeaEl.onload = () => {
        sendRawPhotopeaCmd(namespace, photopeaEl, initialData);

        if (designGenSteps) {
          // Start design gen
          sendRawPhotopeaCmd(namespace, photopeaEl, updateLayersCmd(designGenSteps.layerUpdates)); // Start the layer updates complete check.

          if (!pollIntervalMap[namespace]) {
            const intervalId = setInterval(() => {
              sendRawPhotopeaCmd(
                namespace,
                photopeaEl,
                checkLayerUpdatesComplete(namespace, designGenSteps),
              );
            }, CHECK_LAYER_UPDATES_COMPLETE_INTERVAL);
            setPollIntervalMap((prev) => ({ ...prev, [namespace]: intervalId }));
          }
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
