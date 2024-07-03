"use client";
import _ from "lodash";
import { createContext, RefObject, useCallback, useContext, useEffect, useState } from "react";
import { getLayerCountCmd } from "../libs/designs/photopea";

export type FileExport = { [key: string]: ArrayBuffer | null }; // { jpg: ArrayBuffer, psd: ArrayBuffer }

type PhotopeaHeadlessContextValue = {
  sendRawPhotopeaCmd: (namespace: string, cmd: string) => void;
  initialize: (
    namespace: string,
    options: {
      onReady?: () => void;
      onLayerCountChange?: (count: number) => void;
      onFileExport?: (args: FileExport | null) => void;
      onDone?: () => void;
      ref: RefObject<HTMLIFrameElement>;
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

const LAYER_COUNT_POLL_INTERVAL = 10; // Gives more resolution.

function PhotopeaHeadlessProvider({ children }: { children: React.ReactNode }) {
  // Every state here is a map of namespace to some value.

  // Internally managed
  const [pollIntervalMap, setPollIntervalMap] = useState<{ [key: string]: NodeJS.Timeout }>({});
  const [exportQueue, setExportQueue] = useState<ArrayBuffer[]>([]);
  const [exportMetadataQueue, setExportMetadataQueue] = useState<{ namespace: string; format: string }[]>([]);
  const [lastLayerCountChange, setLastLayerCountChange] = useState<{ [key: string]: number }>({});
  const [isInitialized, setIsInitialized] = useState<{ [key: string]: boolean }>({});
  const [isLoadedMap, setIsLoadedMap] = useState<{ [key: string]: boolean }>({});
  const [isProcessedMap, setIsProcessedMap] = useState<{ [key: string]: boolean }>({});
  const [onReadyMap, setOnReadyMap] = useState<{ [key: string]: () => void }>({});
  const [layerCountMap, setLayerCountMap] = useState<{ [key: string]: number }>({});

  // Exposed to caller
  const [onDoneMap, setOnDoneMap] = useState<{ [key: string]: () => void }>({});
  const [onLayerCountChangeMap, setOnLayerCountChangeMap] = useState<{ [key: string]: (count: number) => void }>({});
  const [onFileExportMap, setOnFileExportMap] = useState<{
    [key: string]: (args: FileExport | null) => void;
  }>({});
  const [photopeaRefMap, setPhotopeaRefMap] = useState<{ [key: string]: RefObject<HTMLIFrameElement> }>({});

  const processEventFromPhotopea = useCallback(
    async (e: MessageEvent) => {
      if (_.isString(e.data)) {
        if (e.data.startsWith("loaded")) {
          // loaded:namespace-123
          const [_loaded, namespace] = e.data.split(":");
          if (isLoadedMap[namespace]) {
            return;
          }
          setIsLoadedMap((prev) => ({ ...prev, [namespace]: true }));
          onReadyMap[namespace]?.();
        }
        if (e.data.startsWith("layer_count")) {
          // layer_count:namespace-123:3
          const [_layerCount, namespace, layerCount] = e.data.split(":");
          const layerCountInt = parseInt(layerCount);

          // If the layer count has changed, update the
          const now = new Date().getTime();
          if (
            lastLayerCountChange[namespace] &&
            now - lastLayerCountChange[namespace] >= 5000 &&
            !isProcessedMap[namespace]
          ) {
            console.log("layer count has not changed in 5 seconds, clearing", namespace);
            clear(namespace);
            setIsProcessedMap((prev) => ({ ...prev, [namespace]: true }));
            onDoneMap[namespace]?.();
          }

          if (layerCountMap[namespace] !== layerCountInt) {
            setLayerCountMap((prev) => ({ ...prev, [namespace]: layerCountInt }));
            setLastLayerCountChange((prev) => ({ ...prev, [namespace]: new Date().getTime() }));
            onLayerCountChangeMap[namespace]?.(layerCountInt);
          }
        }
        if (e.data.startsWith("export_file")) {
          // export_file:namespace-123:jpg
          const [_exportFile, namespace, format] = e.data.split(":");
          setExportMetadataQueue((prev) => [...prev, { namespace, format }]);

          if (onFileExportMap[namespace]) {
            const mostRecentExport = getMostRecentExport(namespace);
            onFileExportMap[namespace](mostRecentExport);
          }
        }
      }
      if (e.data instanceof ArrayBuffer) {
        setExportQueue((prev) => [...prev, e.data]);
      }
    },
    [isInitialized, layerCountMap, exportMetadataQueue, exportQueue, onFileExportMap], // We need this to be a dependency, because we need all callbacks to be set.
  );

  useEffect(() => {
    window.addEventListener("message", processEventFromPhotopea);
    return () => {
      window.removeEventListener("message", processEventFromPhotopea);
    };
  }, [processEventFromPhotopea]);

  const sendRawPhotopeaCmd = (namespace: string, cmd: string) => {
    const ppRef = photopeaRefMap[namespace];
    if (!ppRef?.current) {
      // console.log("photopea command rejected because ref is not ready", namespace, cmd);
      return;
    }
    const ppWindow = ppRef.current.contentWindow;
    if (!ppWindow) {
      console.log("photopea command rejected because window is not ready", namespace, cmd);
      return;
    }
    if (cmd.indexOf("layer_count") === -1) {
      // console.log("sending photopea cmd", cmd);
    }
    ppWindow.postMessage(cmd, "*");
  };

  const attachLayerCountChangeListener = (namespace: string, callback?: (count: number) => void) => {
    if (callback) {
      if (!pollIntervalMap[namespace]) {
        const intervalId = setInterval(() => {
          sendRawPhotopeaCmd(namespace, getLayerCountCmd(namespace));
        }, LAYER_COUNT_POLL_INTERVAL);

        setPollIntervalMap((prev) => ({ ...prev, [namespace]: intervalId }));
      }

      setOnLayerCountChangeMap((prev) => ({
        ...prev,
        [namespace]: _.debounce(callback, 100),
      }));
    }
  };
  const attachFileExportListener = (namespace: string, callback?: (args: FileExport | null) => void) => {
    if (callback) {
      setOnFileExportMap((prev) => ({
        ...prev,
        [namespace]: _.debounce(callback, 100),
      }));
    }
  };
  const attachPhotopeaRef = (namespace: string, ref: RefObject<HTMLIFrameElement>) => {
    setPhotopeaRefMap((prev) => ({
      ...prev,
      [namespace]: ref,
    }));
  };
  const attachOnReadyListener = (namespace: string, callback?: () => void) => {
    if (callback) {
      setOnReadyMap((prev) => ({
        ...prev,
        [namespace]: _.debounce(callback, 100),
      }));
    }
  };
  const attachOnDoneListener = (namespace: string, callback?: () => void) => {
    if (callback) {
      setOnDoneMap((prev) => ({
        ...prev,
        [namespace]: _.debounce(callback, 100),
      }));
    }
  };

  const getMostRecentExport = (namespace: string): FileExport | null => {
    let mostRecentJpgIndex = -1;
    let mostRecentPsdIndex = -1;
    for (let i = 0; i < exportMetadataQueue.length; i++) {
      if (exportMetadataQueue[i].namespace === namespace && exportMetadataQueue[i].format === "jpg") {
        mostRecentJpgIndex = i;
      } else if (exportMetadataQueue[i].namespace === namespace && exportMetadataQueue[i].format === "psd") {
        mostRecentPsdIndex = i;
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
    setLayerCountMap(deleteNamespace(namespace));
    setOnFileExportMap(deleteNamespace(namespace));
    setOnReadyMap(deleteNamespace(namespace));
    setOnLayerCountChangeMap(deleteNamespace(namespace));
    setPhotopeaRefMap(deleteNamespace(namespace));
    setIsInitialized(deleteNamespace(namespace));
    setOnDoneMap(deleteNamespace(namespace));
    setIsLoadedMap(deleteNamespace(namespace));
    setIsProcessedMap(deleteNamespace(namespace));
    setLastLayerCountChange(deleteNamespace(namespace));
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
    {
      onReady,
      onLayerCountChange,
      onFileExport,
      onDone,
      ref,
    }: {
      onReady?: () => void;
      onFileExport?: (args: FileExport | null) => void;
      onLayerCountChange?: (count: number) => void;
      onDone?: () => void;
      ref: RefObject<HTMLIFrameElement>;
    },
  ) => {
    // This ensures that we always starts with a clean slate.
    clear(namespace);

    attachPhotopeaRef(namespace, ref);

    setTimeout(() => {
      // We wait for the next tick to ensure the ref is attached before anything is done.
      attachLayerCountChangeListener(namespace, onLayerCountChange);
      attachOnReadyListener(namespace, onReady);
      attachFileExportListener(namespace, onFileExport);
      attachOnDoneListener(namespace, onDone);
      setIsInitialized((prev) => ({ ...prev, [namespace]: true }));
    });
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
