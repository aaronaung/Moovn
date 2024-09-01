import { Psd } from "ag-psd";

import { format } from "date-fns";

export type LoadAssets = LoadAsset[];
export type LoadAsset = {
  asset: ArrayBuffer;
  layerName: string;
};

export type EditTexts = {
  layerName: string;
  value: string;
}[];

export type DeleteLayers = {
  layerName: string;
}[];

export type ReplaceLayers = {
  sourceLayerName: string;
  targetLayerName: string;

  // We may want to let users configure this in the template in the future.
  // For now, the design generation process associates the ig tag with the target layer's position.
  instagramTag?: string;
}[];

export type DesignGenSteps = {
  editTexts: EditTexts;
  loadAssets: LoadAssets;
  deleteLayers: DeleteLayers;
  replaceLayers: ReplaceLayers;
};

export const determineDesignGenSteps = async (
  schedules: any,
  template: Psd,
): Promise<DesignGenSteps> => {
  if (!template.children) {
    return {
      loadAssets: [],
      editTexts: [],
      deleteLayers: [],
      replaceLayers: [],
    };
  }

  const loadAssetsPromises = [];
  const genSteps: DesignGenSteps = {
    editTexts: [],
    loadAssets: [],
    deleteLayers: [],
    replaceLayers: [],
  };

  for (const layer of template.children) {
    if (!layer.name || !layer.id) {
      continue;
    }
    const ogLayerName = layer.name;

    const [layerName, dateFormat] = layer.name.trim().split("|") || [];
    const value = schedules[layerName];

    if (!layerName.startsWith("day")) {
      // Skip if the layer name does not start with "day". We don't want to
      // replace the layer if it's not a schedule layer.
      continue;
    }
    if (!value) {
      genSteps.deleteLayers = [
        ...(genSteps.deleteLayers ?? []),
        {
          layerName: ogLayerName,
        },
      ];
      continue;
    }
    if (layerName.endsWith("start") || layerName.endsWith("end") || layerName.endsWith("date")) {
      genSteps.editTexts = [
        ...(genSteps.editTexts ?? []),
        {
          layerName: ogLayerName,
          value: dateFormat ? format(new Date(value), dateFormat.trim()) : value,
        },
      ];
    } else if (layer.placedLayer) {
      let instagramTag;
      if (layerName.indexOf("staff") !== -1) {
        const split = layerName.split(".");
        split.pop();
        instagramTag = schedules[`${split.join(".")}.instagramHandle`];
      }

      const index = genSteps.loadAssets.length;
      const valueSplit = value.split("/");
      const loadedAssetLayerName = valueSplit[valueSplit.length - 1]; // Photoshop always uses the last segment of the URL as the layer name.
      loadAssetsPromises.push(
        new Promise<LoadAsset>(async (resolve, reject) => {
          resolve({
            // We load the image with index as an anchor to uniquely identify the layer. That way, we can translate/move the loaded asset to the layer name later.
            asset: await (
              await fetch(`/api/sources/download-image`, {
                method: "POST",
                body: JSON.stringify({ url: value }),
                headers: {
                  "Content-Type": "application/json",
                },
              })
            ).arrayBuffer(),
            layerName: `${loadedAssetLayerName}#${index}`,
          });
        }),
      );

      genSteps.replaceLayers.push({
        sourceLayerName: `${loadedAssetLayerName}#${index}`,
        targetLayerName: ogLayerName,
        ...(instagramTag ? { instagramTag } : {}),
      });
    } else if (layer.text) {
      genSteps.editTexts = [
        ...(genSteps.editTexts ?? []),
        {
          layerName: ogLayerName,
          value, // value is the text content
        },
      ];
    }
  }

  genSteps.loadAssets = await Promise.all(loadAssetsPromises);
  return genSteps;
};
