"use client";
import _ from "lodash";
import { createContext, RefObject, useCallback, useContext, useEffect, useState } from "react";
import { getLayerCountCmd } from "../libs/designs/photopea";

type PhotopeaContextValue = {
  sendExportFileCmd: (namespace: string, format: "jpg" | "psd") => void;
  sendRawPhotopeaCmd: (namespace: string, cmd: string) => void;
  exportQueue: ArrayBuffer[];
  exportMetadataQueue: { namespace: string; format: string }[];
  getCurrentLayerCount: (namespace: string) => number;
  initialize: (
    namespace: string,
    options: {
      onReady: () => void;
      onLayerCountChange: (count: number) => void;
      ref: RefObject<HTMLIFrameElement>;
    },
  ) => void;
  clear: (namespace: string) => void;
};

const PhotopeaContext = createContext<PhotopeaContextValue | null>(null);

function usePhotopea() {
  const context = useContext(PhotopeaContext);
  if (!context) {
    throw new Error(`usePhotopea must be used within a PhotopeaProvider`);
  }
  return context;
}

const PHOTOPEA_POLL_INTERVAL = 200;

function PhotopeaProvider({ children }: { children: React.ReactNode }) {
  // Every state here is a map of namespace to some value.

  // Internally managed
  const [pollIntervalMap, setPollIntervalMap] = useState<{ [key: string]: NodeJS.Timeout }>({});
  const [exportQueue, setExportQueue] = useState<ArrayBuffer[]>([]);
  const [exportMetadataQueue, setExportMetadataQueue] = useState<{ namespace: string; format: string }[]>([]);

  const [isInitialized, setIsInitialized] = useState<{ [key: string]: boolean }>({});
  const [isLoadedMap, setIsLoadedMap] = useState<{ [key: string]: boolean }>({});

  // Exposed to caller
  const [onReadyMap, setOnReadyMap] = useState<{ [key: string]: () => void }>({});
  const [layerCountMap, setLayerCountMap] = useState<{ [key: string]: number }>({});
  const [onLayerCountChangeMap, setOnLayerCountChangeMap] = useState<{ [key: string]: (count: number) => void }>({});
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
          if (onReadyMap[namespace]) {
            onReadyMap[namespace]();
          }
        }
        if (e.data.startsWith("layer_count")) {
          // layer_count:namespace-123:3
          const [_layerCount, namespace, layerCount] = e.data.split(":");
          const layerCountInt = parseInt(layerCount);

          if (layerCountMap[namespace] !== layerCountInt) {
            console.log("layer count changed", layerCountMap, layerCountInt);
            setLayerCountMap((prev) => ({ ...prev, [namespace]: layerCountInt }));
            if (onLayerCountChangeMap[namespace]) {
              onLayerCountChangeMap[namespace](layerCountInt);
            }
          }
        }
        if (e.data.startsWith("export_file")) {
          // export_file:namespace-123:jpg
          const [_exportFile, namespace, format] = e.data.split(":");
          setExportMetadataQueue((prev) => [...prev, { namespace, format }]);
        }
      }
      if (e.data instanceof ArrayBuffer) {
        setExportQueue((prev) => [...prev, e.data]);
      }
    },
    [isInitialized, layerCountMap], // We need this to be a dependency, because we need all callbacks to be set.
  );

  useEffect(() => {
    window.addEventListener("message", processEventFromPhotopea);
    return () => {
      window.removeEventListener("message", processEventFromPhotopea);
    };
  }, [processEventFromPhotopea]);

  // Set up polling.
  useEffect(() => {
    for (const [namespace, _] of Object.entries(photopeaRefMap)) {
      if (pollIntervalMap[namespace]) {
        clearInterval(pollIntervalMap[namespace]);
      }

      const intervalId = setInterval(() => {
        sendRawPhotopeaCmd(namespace, getLayerCountCmd(namespace, !Boolean(isLoadedMap[namespace])));
      }, PHOTOPEA_POLL_INTERVAL);

      setPollIntervalMap((prev) => ({ ...prev, [namespace]: intervalId }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photopeaRefMap, isLoadedMap]);

  const sendRawPhotopeaCmd = (namespace: string, cmd: string) => {
    const ppRef = photopeaRefMap[namespace];
    if (!ppRef?.current) {
      console.log("photopea command rejected because ref is not ready", namespace, cmd);
      return;
    }
    const ppWindow = ppRef.current.contentWindow;
    if (!ppWindow) {
      console.log("photopea command rejected because window is not ready", namespace, cmd);
      return;
    }
    if (cmd.indexOf("layer_count") === -1) {
      console.log("sending photopea cmd", cmd);
    }
    ppWindow.postMessage(cmd, "*");
  };

  const attachLayerCountChangeListener = (namespace: string, callback: (count: number) => void) => {
    setOnLayerCountChangeMap((prev) => ({
      ...prev,
      [namespace]: callback,
    }));
  };

  const attachPhotopeaRef = (namespace: string, ref: RefObject<HTMLIFrameElement>) => {
    setPhotopeaRefMap((prev) => ({
      ...prev,
      [namespace]: ref,
    }));
  };

  const attachOnReadyListener = (namespace: string, callback: () => void) => {
    setOnReadyMap((prev) => ({
      ...prev,
      [namespace]: callback,
    }));
  };

  const sendExportFileCmd = (namespace: string, format: "jpg" | "psd") => {
    sendRawPhotopeaCmd(
      namespace,
      `app.activeDocument.saveToOE("${format}");
      app.echoToOE("export_file:${namespace}:${format}");`,
    );
  };

  const getCurrentLayerCount = (namespace: string) => layerCountMap[namespace];

  const clear = (namespace: string) => {
    if (pollIntervalMap[namespace]) {
      clearInterval(pollIntervalMap[namespace]);
    }
    setPollIntervalMap((prev) => {
      const copy = { ...prev };
      delete copy[namespace];
      return copy;
    });
    setLayerCountMap((prev) => {
      const copy = { ...prev };
      delete copy[namespace];
      return copy;
    });

    setOnLayerCountChangeMap((prev) => {
      const copy = { ...prev };
      delete copy[namespace];
      return copy;
    });
    setPhotopeaRefMap((prev) => {
      const copy = { ...prev };
      delete copy[namespace];
      return copy;
    });
    setIsInitialized((prev) => {
      const copy = { ...prev };
      delete copy[namespace];
      return copy;
    });
  };

  const initialize = (
    namespace: string,
    {
      onReady,
      onLayerCountChange,
      ref,
    }: {
      onReady: () => void;
      onLayerCountChange: (count: number) => void;
      ref: RefObject<HTMLIFrameElement>;
    },
  ) => {
    attachLayerCountChangeListener(namespace, onLayerCountChange);
    attachOnReadyListener(namespace, onReady);
    attachPhotopeaRef(namespace, ref);
    setIsInitialized((prev) => ({ ...prev, [namespace]: true }));
  };

  return (
    <PhotopeaContext.Provider
      value={{
        initialize,
        sendExportFileCmd,
        sendRawPhotopeaCmd,
        getCurrentLayerCount,
        exportQueue,
        exportMetadataQueue,
        clear,
      }}
    >
      {children}
    </PhotopeaContext.Provider>
  );
}

export { PhotopeaProvider, usePhotopea };
export default PhotopeaContext;
