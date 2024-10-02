"use client";
import _ from "lodash";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { DesignGenSteps } from "../libs/designs/photoshop-v2";
import { readPsd, Psd } from "ag-psd";
import {
  cropImagesCmd,
  replaceLayersCmd,
  verifyReplaceLayersComplete,
} from "../libs/designs/photopea/replace-layers";
import { editTextsCmd, verifyEditTextsComplete } from "../libs/designs/photopea/edit-texts";
import {
  deleteLayersCmd,
  verifyDeleteLayersComplete,
} from "../libs/designs/photopea/delete-layers";
import { exportCmd, InstagramTag } from "../libs/designs/photopea/utils";
import {
  focusDocZero,
  moveAndRenameLoadedAssetCmd,
  verifyLoadAssetsComplete,
} from "../libs/designs/photopea/load-assets";
import { verifyInitialLayerLoaded } from "../libs/designs/photopea/initial-layer-loaded";
import { useSearchParams } from "next/navigation";

export type DesignExport = {
  jpg: ArrayBuffer | null;
  psd: ArrayBuffer | null;
  instagramTags?: InstagramTag[];
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
const DEFAULT_TIMEOUT = 30_000;

function PhotopeaHeadlessProvider({ children }: { children: React.ReactNode }) {
  // Every state here is a map of namespace to some value.
  const params = useSearchParams();

  // Internally managed
  const timeoutMap = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const pollIntervalMapRef = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const debugGenStepMap = useRef<{ [key: string]: string }>({});
  const timeSpentMap = useRef<{ [key: string]: { [key: string]: number } }>({});

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
      // These events occur in order.
      if (_.isString(e.data)) {
        if (e.data.startsWith("initial_layer_loaded")) {
          // initial_layer_loaded:namespace-123
          const [_, namespace] = e.data.split(":");
          markStepDone(namespace, "start");
          executeDesignGenStep("loadAssets", namespace);
          debugGenStepMap.current[namespace] = "loadAssets";
        }
        if (e.data.startsWith("load_assets_complete")) {
          // load_assets_complete:namespace-123
          const [_, namespace] = e.data.split(":");
          markStepDone(namespace, "loadAssets");
          executeDesignGenStep("deleteLayers", namespace);
          debugGenStepMap.current[namespace] = "deleteLayers";
        }
        if (e.data.startsWith("delete_layers_complete")) {
          // delete_layers_complete:namespace-123
          const [_, namespace, isComplete] = e.data.split(":");
          if (isComplete === "true") {
            markStepDone(namespace, "deleteLayers");
            executeDesignGenStep("editTexts", namespace);
            debugGenStepMap.current[namespace] = "editTexts";
          } else {
            executeDesignGenStep("deleteLayers", namespace);
          }
        }
        if (e.data.startsWith("edit_texts_complete")) {
          // edit_texts_complete:namespace-123
          const [_, namespace, isComplete] = e.data.split(":");
          if (isComplete === "true") {
            markStepDone(namespace, "editTexts");
            executeDesignGenStep("replaceLayers", namespace);
            debugGenStepMap.current[namespace] = "replaceLayers";
          } else {
            executeDesignGenStep("editTexts", namespace);
          }
        }
        if (e.data.startsWith("replace_layers_complete")) {
          // replace_layers_complete:namespace-123
          const [_, namespace, isComplete] = e.data.split(":");
          if (isComplete === "true") {
            markStepDone(namespace, "replaceLayers");
            executeDesignGenStep("cropImages", namespace);
            debugGenStepMap.current[namespace] = "cropImages";
          } else {
            executeDesignGenStep("replaceLayers", namespace);
          }
        }
        if (e.data.startsWith("crop_images_complete")) {
          // crop_images_complete:namespace-123
          const [_, namespace, isComplete] = e.data.split(":");
          if (isComplete === "true") {
            markStepStart(namespace, "export");
            debugGenStepMap.current[namespace] = "export";
            if (pollIntervalMapRef.current[namespace]) {
              clearIntervalForNamespace(namespace);
            }
            if (photopeaMap[namespace]) {
              setTimeout(() => {
                // Let the changes settle before exporting.
                sendRawPhotopeaCmd(namespace, photopeaMap[namespace], exportCmd(namespace));
              }, 1000);
            }
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
    setInterval(() => {
      console.log("debugGenStepMap", debugGenStepMap.current);
      console.log("timeSpentMap", timeSpentMap.current);
    }, 10000);

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
    const exportDesign = async () => {
      if (exportMetadataQueue.length > 0 && exportQueue.length > 0) {
        for (const exportMetadata of exportMetadataQueue) {
          const namespace = exportMetadata.namespace;
          const mostRecentExport = getMostRecentExport(namespace);
          if (mostRecentExport?.jpg && mostRecentExport?.psd && onDesignExportMap[namespace]) {
            const psd = readPsd(mostRecentExport.psd);

            // const isValid = validateLayerUpdates(namespace, psd);
            // if (!isValid) {
            //   console.log(
            //     "bad layer update - clearing exports and rerunning layer updates",
            //     namespace,
            //   );
            //   // If the PSD is not valid, clear exports and rerun from the editTexts step.
            //   setExportMetadataQueue((prev) => prev.filter((e) => e.namespace !== namespace));
            //   setExportQueue((prev) =>
            //     prev.filter((e, i) => exportMetadataQueue[i]?.namespace !== namespace),
            //   );
            //   executeDesignGenStep("editTexts", namespace);
            //   return;
            // } else {
            console.log(`${namespace}: exporting design`, {
              jpg: mostRecentExport.jpg,
              psd: mostRecentExport.psd,
              psdData: psd,
              exportQueue,
              exportMetadataQueue,
            });

            const debugKey = params.get("debug");
            if (debugKey) {
              const debugJpg = document.createElement("img");
              debugJpg.src = URL.createObjectURL(new Blob([mostRecentExport.jpg]));
              debugJpg.style.width = "350px";
              debugJpg.style.height = "350px";
              document.body.appendChild(debugJpg);
            }
            // }

            markStepDone(namespace, "export");
            debugGenStepMap.current[namespace] = "completed/exported";
            onDesignExportMap[namespace](mostRecentExport);
            clear(namespace);
            clearTimeout(timeoutMap.current[namespace]);
            return;
          }
        }
      }
    };
    exportDesign();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exportQueue, exportMetadataQueue, onDesignExportMap]);

  const validateLayerUpdates = (namespace: string, psd: Psd) => {
    for (const editTexts of designGenStepsMap[namespace]?.editTexts ?? []) {
      for (const child of psd.children || []) {
        if (child.name === editTexts.layerName && child.text?.text !== editTexts.value) {
          console.error("layer update error: layer text wasn't updated correctly", {
            layer_name: child.name,
            layer_text: child.text,
            required_value: editTexts.value,
            required_name: editTexts.layerName,
          });
          return false;
        }
      }
    }
    return true;
  };

  const executeDesignGenStep = (
    step: keyof DesignGenSteps | "start",
    namespace: string,
    photopea?: HTMLIFrameElement,
    designGenSteps?: DesignGenSteps,
  ) => {
    if (pollIntervalMapRef.current[namespace]) {
      // Clear any existing interval for this namespace.
      clearIntervalForNamespace(namespace);
    }
    const pp = photopea ?? photopeaMap[namespace];
    if (!pp) {
      console.error("photopea not initialized", namespace);
      return;
    }

    let cmds = [];
    let verifyCmd = "";
    const genSteps = designGenSteps ?? designGenStepsMap[namespace];

    switch (step) {
      case "start":
        // console.log("genstep:start", namespace);
        verifyCmd = verifyInitialLayerLoaded(namespace);
        break;
      case "loadAssets":
        // console.log("genstep:loadAssets", namespace);
        for (const loadAsset of genSteps.loadAssets) {
          cmds.push(loadAsset.asset);
          cmds.push(moveAndRenameLoadedAssetCmd(loadAsset));
        }
        cmds.push(focusDocZero());
        verifyCmd = verifyLoadAssetsComplete(
          namespace,
          genSteps.loadAssets.map((a) => ({ layerName: a.layerName })), // We only need the layer names for verification.
        );
        break;
      case "deleteLayers":
        // console.log("genstep:deleteLayers", namespace);
        cmds.push(deleteLayersCmd(namespace, genSteps.deleteLayers));
        verifyCmd = verifyDeleteLayersComplete(namespace, genSteps.deleteLayers);
        break;
      case "editTexts":
        // console.log("genstep:editTexts", namespace);
        cmds.push(editTextsCmd(namespace, genSteps.editTexts));
        verifyCmd = verifyEditTextsComplete(namespace, genSteps.editTexts);
        break;
      case "replaceLayers":
        // console.log("genstep:replaceLayers", namespace);
        cmds.push(replaceLayersCmd(namespace, genSteps.replaceLayers));
        verifyCmd = verifyReplaceLayersComplete(namespace, genSteps.replaceLayers);
        break;
      case "cropImages":
        // console.log("genstep:cropImages", namespace);
        cmds.push(cropImagesCmd(namespace, genSteps.replaceLayers));
        break;
      default:
        break;
    }

    markStepStart(namespace, step);
    if (cmds.length > 0) {
      for (const cmd of cmds) {
        sendRawPhotopeaCmd(namespace, pp, cmd);
      }
    }
    if (verifyCmd) {
      setIntervalForNamespace(
        namespace,
        () => {
          sendRawPhotopeaCmd(namespace, pp, verifyCmd);
        },
        LAYER_CHECK_INTERVAL,
      );
    }
  };

  const markStepStart = (namespace: string, step: keyof DesignGenSteps | "start" | "export") => {
    timeSpentMap.current[namespace] = {
      ...timeSpentMap.current[namespace],
      [step]: performance.now(),
    };
  };
  const markStepDone = (namespace: string, step: keyof DesignGenSteps | "start" | "export") => {
    timeSpentMap.current[namespace] = {
      ...timeSpentMap.current[namespace],
      [step]: performance.now() - (timeSpentMap.current[namespace]?.[step] ?? performance.now()),
    };
  };

  const setIntervalForNamespace = (namespace: string, callback: () => void, delay: number) => {
    clearIntervalForNamespace(namespace);
    pollIntervalMapRef.current[namespace] = setInterval(callback, delay);
  };

  const clearIntervalForNamespace = (namespace: string) => {
    if (pollIntervalMapRef.current[namespace]) {
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
      const start = performance.now();
      // Load the initial data.
      photopeaEl.onload = async () => {
        timeSpentMap.current[namespace] = {
          ...timeSpentMap.current[namespace],
          loadInitialData: performance.now() - start,
        };
        sendRawPhotopeaCmd(namespace, photopeaEl, initialData);

        if (designGenSteps) {
          // Start design gen
          executeDesignGenStep("loadAssets", namespace, photopeaEl, designGenSteps);
        } else {
          console.log("no design gen steps, exporting design", namespace);
          // No design gen steps, just export the design.
          sendRawPhotopeaCmd(namespace, photopeaEl, exportCmd(namespace));
        }
      };
    }

    const timeoutId = setTimeout(() => {
      // Design gen timeout has been reached.
      clear(namespace);
      onTimeout?.();
    }, timeout);
    timeoutMap.current[namespace] = timeoutId;
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
