import { Psd } from "ag-psd";

import { formatInTimeZone } from "date-fns-tz";
import { db } from "../indexeddb/indexeddb";

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
  cropImages?: any;
};

export const determineDesignGenSteps = async (
  schedules: any,
  template: Psd,
  sourceId?: string,
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

  const start = performance.now();
  for (const layer of template.children) {
    if (!layer.name || !layer.id) {
      continue;
    }
    const ogLayerName = layer.name;

    const [lname, dateFormat] = layer.name.trim().split("|") || [];
    const layerName = lname.trim();
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
    } else if (layer.text) {
      let defaultDateFormat;
      if (layerName.endsWith("start")) {
        defaultDateFormat = "hh:mm aa";
      } else if (layerName.endsWith("end")) {
        defaultDateFormat = "hh:mm aa";
      } else if (layerName.endsWith("date")) {
        defaultDateFormat = "EEE, MMM dd";
      }
      const siteTimeZone = schedules["day#1.siteTimeZone"];

      if (defaultDateFormat) {
        genSteps.editTexts = [
          ...(genSteps.editTexts ?? []),
          {
            layerName: ogLayerName,
            value: dateFormat
              ? formatInTimeZone(value, siteTimeZone, dateFormat.trim())
              : formatInTimeZone(value, siteTimeZone, defaultDateFormat),
          },
        ];
      } else {
        genSteps.editTexts = [
          ...(genSteps.editTexts ?? []),
          {
            layerName: ogLayerName,
            value, // value is the text content
          },
        ];
      }
    } else {
      // If you're here, the layer is a staff image.
      const photoRegex = /^day#\d+\.event#\d+\.staff#\d+\.photo$/;
      if (!photoRegex.test(layerName)) {
        continue;
      }
      const staffPhotoUrl = value;

      const staffParentKey = layerName.split(".");
      staffParentKey.pop();
      const instagramTag = schedules[`${staffParentKey.join(".")}.instagramHandle`];

      const index = loadAssetsPromises.length;
      const photoUrlSplit = staffPhotoUrl.split("/");
      const loadedAssetLayerName = photoUrlSplit[photoUrlSplit.length - 1]; // Photoshop always uses the last segment of the URL as the layer name.

      if (staffPhotoUrl) {
        const staffImage = await db.staffImages.get(staffPhotoUrl);
        if (staffImage) {
          loadAssetsPromises.push(
            new Promise<LoadAsset>(async (resolve) => {
              resolve({
                asset: staffImage.blob,
                layerName: `${loadedAssetLayerName}#${index}`,
              });
            }),
          );
        } else {
          // Image not in cache, fetch and store it
          const imageBuffer = await fetchImage(staffPhotoUrl);

          // Store in cache
          await db.staffImages.put({
            key: staffPhotoUrl,
            blob: imageBuffer,
            lastUpdated: new Date(),
          });

          loadAssetsPromises.push(
            new Promise<LoadAsset>(async (resolve) => {
              resolve({
                asset: imageBuffer,
                layerName: `${loadedAssetLayerName}#${index}`,
              });
            }),
          );
        }
      }

      genSteps.replaceLayers.push({
        sourceLayerName: `${loadedAssetLayerName}#${index}`,
        targetLayerName: ogLayerName,
        ...(instagramTag ? { instagramTag } : {}),
      });
    }
  }

  genSteps.loadAssets = await Promise.all(loadAssetsPromises);
  const end = performance.now();
  const duration = end - start;
  console.log("determineDesignGenSteps duration", duration);
  console.log("loadAssets", genSteps.loadAssets);
  return genSteps;
};

const fetchImage = async (url: string): Promise<ArrayBuffer> => {
  const imageResponse = await fetch(`/api/sources/download-image`, {
    method: "POST",
    body: JSON.stringify({ url }),
  });
  return await imageResponse.arrayBuffer();
};
