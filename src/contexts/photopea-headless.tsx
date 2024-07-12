"use client";
import _ from "lodash";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getLayerCountCmd } from "../libs/designs/photopea";

export type FileExport = { [key: string]: ArrayBuffer | null }; // { jpg: ArrayBuffer, psd: ArrayBuffer }

type PhotopeaHeadlessContextValue = {
  sendRawPhotopeaCmd: (
    namespace: string,
    photopea: HTMLIFrameElement,
    cmd: string | ArrayBuffer,
  ) => void;
  initialize: (
    namespace: string,
    options: {
      initialData?: ArrayBuffer;
      photopeaEl: HTMLIFrameElement;
      onInitialDataLoaded?: () => void;
      onLayerCountChange?: (count: number) => void;
      onFileExport?: (args: FileExport | null) => void;
      onIdleTimeout?: () => void;
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

const LAYER_COUNT_POLL_INTERVAL = 100; // Gives more resolution.
const IDLE_TIMEOUT = 5000;

function PhotopeaHeadlessProvider({ children }: { children: React.ReactNode }) {
  // Every state here is a map of namespace to some value.

  // Internally managed
  const [pollIntervalMap, setPollIntervalMap] = useState<{ [key: string]: NodeJS.Timeout }>({});
  const [exportQueue, setExportQueue] = useState<ArrayBuffer[]>([]);
  const [exportMetadataQueue, setExportMetadataQueue] = useState<
    { namespace: string; format: string }[]
  >([]);
  const [lastLayerCountChange, setLastLayerCountChange] = useState<{ [key: string]: number }>({});
  const [layerCountMap, setLayerCountMap] = useState<{ [key: string]: number }>({});

  // Exposed to caller
  const [onIdleTimeoutMap, setOnIdleTimeoutMap] = useState<{ [key: string]: () => void }>({});
  const [onLayerCountChangeMap, setOnLayerCountChangeMap] = useState<{
    [key: string]: (count: number) => void;
  }>({});
  const [onFileExportMap, setOnFileExportMap] = useState<{
    [key: string]: (args: FileExport | null) => void;
  }>({});

  const processEventFromPhotopea = useCallback(
    async (e: MessageEvent) => {
      if (_.isString(e.data)) {
        if (e.data.startsWith("layer_count")) {
          // layer_count:namespace-123:3

          const [_layerCount, namespace, layerCount] = e.data.split(":");
          const layerCountInt = parseInt(layerCount);

          const now = new Date().getTime();
          if (
            lastLayerCountChange[namespace] &&
            now - lastLayerCountChange[namespace] >= IDLE_TIMEOUT
          ) {
            console.log("[Idle Timeout] Clearing ", namespace);
            clear(namespace);
            onIdleTimeoutMap[namespace]?.();
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
    [
      layerCountMap,
      exportMetadataQueue,
      exportQueue,
      onLayerCountChangeMap,
      onIdleTimeoutMap,
      onFileExportMap,
    ], // We need this to be a dependency, because we need all callbacks to be set.
  );

  useEffect(() => {
    window.addEventListener("message", processEventFromPhotopea);
    return () => {
      window.removeEventListener("message", processEventFromPhotopea);
    };
  }, [processEventFromPhotopea]);

  const sendRawPhotopeaCmd = async (
    namespace: string,
    photopea: HTMLIFrameElement,
    cmd: string | ArrayBuffer,
  ) => {
    const ppWindow = photopea.contentWindow;
    if (!ppWindow) {
      console.log("photopea command rejected because window is not ready", namespace, cmd);
      return;
    }
    ppWindow.postMessage(cmd, "*");
  };

  const attachLayerCountChangeListener = (
    namespace: string,
    photopea: HTMLIFrameElement,
    callback?: (count: number) => void,
  ) => {
    if (callback) {
      if (!pollIntervalMap[namespace]) {
        const intervalId = setInterval(() => {
          sendRawPhotopeaCmd(namespace, photopea, getLayerCountCmd(namespace));
        }, LAYER_COUNT_POLL_INTERVAL);

        setPollIntervalMap((prev) => ({ ...prev, [namespace]: intervalId }));
      }

      setOnLayerCountChangeMap((prev) => ({
        ...prev,
        [namespace]: _.debounce(callback, 100),
      }));
    }
  };
  const attachFileExportListener = (
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
  const attachOnIdleTimeoutListener = (namespace: string, callback?: () => void) => {
    if (callback) {
      setOnIdleTimeoutMap((prev) => ({
        ...prev,
        [namespace]: _.debounce(callback, 100),
      }));
    }
  };

  const getMostRecentExport = (namespace: string): FileExport | null => {
    let mostRecentJpgIndex = -1;
    let mostRecentPsdIndex = -1;
    for (let i = 0; i < exportMetadataQueue.length; i++) {
      if (
        exportMetadataQueue[i].namespace === namespace &&
        exportMetadataQueue[i].format === "jpg"
      ) {
        mostRecentJpgIndex = i;
      } else if (
        exportMetadataQueue[i].namespace === namespace &&
        exportMetadataQueue[i].format === "psd"
      ) {
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
    setOnLayerCountChangeMap(deleteNamespace(namespace));
    setOnIdleTimeoutMap(deleteNamespace(namespace));
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
      initialData,
      photopeaEl,
      onInitialDataLoaded,
      onLayerCountChange,
      onFileExport,
      onIdleTimeout,
    }: {
      initialData?: ArrayBuffer;
      photopeaEl: HTMLIFrameElement;
      onInitialDataLoaded?: () => void;
      onFileExport?: (args: FileExport | null) => void;
      onLayerCountChange?: (count: number) => void;
      onIdleTimeout?: () => void;
    },
  ) => {
    // This ensures that we always starts with a clean slate.
    clear(namespace);

    // These listeners need to be attached first, so that they can be called when the events are received.
    attachFileExportListener(namespace, onFileExport);
    attachOnIdleTimeoutListener(namespace, onIdleTimeout);

    if (onLayerCountChange && !initialData) {
      console.error("onLayerCountChange cannot be set without initialData");
    }
    if (!onLayerCountChange) {
      // There's no layer count change listener, so we can simply start ticking the idle timeout.
      setTimeout(() => {
        onIdleTimeout?.();
      }, IDLE_TIMEOUT);
    }

    setTimeout(() => {
      if (initialData) {
        sendRawPhotopeaCmd(namespace, photopeaEl, initialData);
        // Get the initial layer count. This is useful for knowing when the document is loaded.
        sendRawPhotopeaCmd(namespace, photopeaEl, getLayerCountCmd(namespace));
        onInitialDataLoaded?.();

        // Layer count change cannot run until the initial data is loaded.
        attachLayerCountChangeListener(namespace, photopeaEl, onLayerCountChange);
      }
    }, 1000); // This ensures the iframe is loaded onto the DOM before anything is done.
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
