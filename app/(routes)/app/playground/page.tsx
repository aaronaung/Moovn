"use client";

import { SourceDataView } from "@/src/consts/sources";
import { BUCKETS } from "@/src/consts/storage";
import { supaClientComponentClient } from "@/src/data/clients/browser";
import { getScheduleDataForSource } from "@/src/data/sources";
import { moveLayerCmd } from "@/src/libs/designs/photopea";
import { determinePSDActions, PSDActions, PSDActionType } from "@/src/libs/designs/photoshop-v2";
import { transformScheduleV2 } from "@/src/libs/sources/utils";
import { sleep } from "@/src/utils";
import { Layer, Psd, readPsd } from "ag-psd";
import _ from "lodash";
import { useEffect, useRef, useState } from "react";

const printTextLayers = (psd: Psd) => {
  if (!psd.children) {
    return {};
  }

  // parentDataObject is a reference to a nested/sub-object in the schedules data that can be accessed using the Layer name.
  const print = (layer: Layer, parentName: string) => {
    if (!layer.id || !layer.name) {
      return;
    }

    // If value is provided, it means we are at the leaf node.
    if (layer.text && parentName.startsWith("events")) {
      console.log(`${parentName}.${layer.name}`, layer);
    } else {
      // If value is not provided, it means we are at the parent node. We need to go deeper.
      const [layerName, index] = layer.name.trim().split("#") || [];
      const _index = Number(index?.trim()) - 1; // customer readable index starts at 1.
      if (!layerName || index === undefined || isNaN(_index) || _index < 0) {
        return;
      }

      for (const childLayer of layer.children ?? []) {
        if (!childLayer.name || !childLayer.id) {
          continue;
        }
        print(childLayer, layer.name);
      }
    }
  };

  for (const root of psd.children) {
    if (!root.name || !root.id) {
      continue;
    }
    const [layerName, index] = root.name.trim().split("#") || [];
    // root layer should be a set of folders. e.g. schedules#0 or schedules#1
    const _index = Number(index?.trim()) - 1; // customer readable index starts at 1.
    if (!layerName || index === undefined || isNaN(_index) || _index < 0) {
      continue;
    }
    // e.g. schedules#0 or schedules#1
    for (const childLayer of root.children ?? []) {
      if (!childLayer.name || !childLayer.id) {
        continue;
      }
      print(childLayer, root.name);
    }
  }
  return;
};

const processPSDActionsCmd = (layers: { layerName: string; value: string }[]) => `
// Get the active document
var doc = app.activeDocument;

var layers = ${JSON.stringify(layers)}

for (var i = 0; i < layers.length; i++) {
    var layer = layers[i];
    // Get the text layer by name
    var textLayer = doc.artLayers.getByName(layer.layerName);

    // Check if the layer is a text layer
    if (textLayer.kind == LayerKind.TEXT) {
        // Set the new text content
        textLayer.textItem.contents = layer.value;
    } else {
        alert("The specified layer is not a text layer.");
    }
}
`;

const saveCmd = (format: "jpg" | "psd") => `
app.activeDocument.saveToOE("${format}");
`;

export default function Playground() {
  const ppRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [ppAnchor, setPpAnchor] = useState<string>();
  const [resultJpg, setResultJpg] = useState<string>();
  const [testImage, setTestImage] = useState<string>();
  const [layerCount, setLayerCount] = useState(0);
  const [layersToMove, setLayersToMove] = useState<{ from: string; to: string }[]>([]);

  useEffect(() => {
    // sendCmd(`app.activeDocument.activeLayer.name = '${orderedReplacedLayers[currentLayerIndex]}'`);
    for (const { from, to } of layersToMove) {
      sendCmd(moveLayerCmd({ from, to }));
    }
  }, [layerCount]);

  useEffect(() => {
    const pollForLayerCount = async () => {
      while (true) {
        await sleep(50);
        sendCmd('app.echoToOE("layer_count:" + app.activeDocument.artLayers.length);');
      }
    };
    pollForLayerCount();

    window.addEventListener("message", function (e) {
      if (_.isString(e.data)) {
        if (e.data.startsWith("layer_count")) {
          const count = parseInt(e.data.split(":")[1]);
          if (layerCount !== count) {
            setLayerCount(count);
            // console.log("layer_count", layerCount, count);
          }
        }
      }
      if (e.data instanceof ArrayBuffer) {
        // This is a save event.
        console.log("received save event", e.data);
        var blob = new Blob([e.data], { type: "image/jpeg" });
        var objectUrl = URL.createObjectURL(blob);
        setResultJpg(objectUrl);
      }
    });
  }, []);

  useEffect(() => {
    const fetchSignedUrl = async () => {
      setIsLoading(true);
      try {
        const todaySchedule = await getScheduleDataForSource({
          id: "c3933917-5313-4a4d-a31f-b4234df3d7a3",
          view: SourceDataView.WEEKLY,
        });

        const { data, error } = await supaClientComponentClient.storage
          .from(BUCKETS.templates)
          .createSignedUrl(
            `fea29740-ef10-4fc6-98cb-191c9b2f4a74/d12ff16d-3fc4-47e6-b39a-03befbe7be0d.psd`,
            26 * 3600,
          );
        if (error || !data) {
          console.log("fetch signed url error", error);
          return;
        }
        const ppAnchor = encodeURIComponent(
          JSON.stringify({
            files: [data.signedUrl],
            environment: {},
          }),
        );
        setPpAnchor(ppAnchor);
        const templateFile = await (await fetch(data.signedUrl)).blob();
        const psd = readPsd(await templateFile.arrayBuffer());
        const psdActions = determinePSDActions(transformScheduleV2(todaySchedule), psd);
        console.log({ todaySchedule, psdActions, ppAnchor });

        setTimeout(async () => {
          console.log("sending edit cmd to pp");
          // await handleSendEditCmds(psdActions);
        }, 1000);
      } catch (err) {
        console.error("error", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSignedUrl();
  }, []);

  const sendCmd = (cmd: string | ArrayBuffer) => {
    if (!ppRef.current) {
      return;
    }
    const ppWindow = ppRef.current.contentWindow;
    if (!ppWindow) {
      return;
    }
    ppWindow.postMessage(cmd, "*");
  };

  const handleSendEditCmds = async (psdActions: PSDActions) => {
    const editText = Object.entries(psdActions[PSDActionType.EditText as string]).map(
      ([name, { value }]) => ({
        name,
        value,
      }),
    );
    const deleteLayer = Object.entries(psdActions[PSDActionType.DeleteLayer as string]).map(
      ([name, { value }]) => ({
        name,
        value,
      }),
    );
    const replaceSmartObject = Object.entries(
      psdActions[PSDActionType.LoadSmartObjectFromUrl as string],
    ).map(([name, { value }], index) => {
      const valueSplit = value.split("/");
      // Photoshop always uses the last part of the URL as the layer name.
      const newlyCreatedLayerName = valueSplit[valueSplit.length - 1];

      return {
        name,
        // We attach index to the urls, so that we can identify the layer later. The last part of the url can be the same for different layers.
        value: `${value}#${index}`,
        newlyCreatedLayerName: `${newlyCreatedLayerName}#${index}`,
      };
    });
    setLayersToMove(
      replaceSmartObject.map(({ name, newlyCreatedLayerName }) => ({
        from: newlyCreatedLayerName,
        to: name,
      })),
    );

    //   sendCmd(`
    //     app.open("https://picsum.photos/150",null,true)

    //     var active = doc.activeLayer
    //     var target = doc.layers.getByName("schedules#6.events#1.staff_members#1.profile_photo")

    //     var targetLeft = target.bounds[0].value;
    //     var activeLeft = active.bounds[0].value;

    //     var targetTop = target.bounds[1].value;
    //     var activeTop = active.bounds[1].value;

    //     active.move(target, ElementPlacement.PLACEBEFORE)
    //     active.translate(targetLeft - activeLeft, targetTop - activeTop)
    //     target.remove();
    // }`);
    setTimeout(() => {
      sendCmd(saveCmd("jpg"));
    }, 1000);
  };

  return (
    <div>
      {layerCount}
      {/* <p className="text-red-50">{orderedReplacedLayers.join(",")}</p> */}
      {isLoading && <div>Loading...</div>}
      {ppAnchor && (
        <iframe
          ref={ppRef}
          className=" h-screen w-full"
          src={`https://www.photopea.com#${ppAnchor}`}
        />
      )}
      {/* {resultJpg && <img src={resultJpg} alt="test" />} */}
    </div>
  );
}
