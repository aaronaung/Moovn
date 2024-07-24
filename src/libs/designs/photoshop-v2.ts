import { Psd } from "ag-psd";

import { format } from "date-fns";

export enum LayerUpdateType {
  EditText = "editText",
  LoadSmartObjectFromUrl = "loadSmartObjectFromUrl",
  DeleteLayer = "deleteLayer",
}

export type LayerUpdates = {
  // LayerUpdateType is the key
  [key: string]: {
    value: any;
    name: string;
    instagramTag?: string;
    newLayerName?: string; // Only used for LoadSmartObjectFromUrl
  }[];
};
export type LayerTranslates = { from: string; to: string; instagramTag?: string }[];

export type DesignGenSteps = {
  layerUpdates: LayerUpdates;
  layerTranslates: LayerTranslates;
};

export const determineDesignGenSteps = (schedules: any, psd: Psd): DesignGenSteps => {
  if (!psd.children) {
    return {
      layerUpdates: {},
      layerTranslates: [],
    };
  }

  const layerUpdates: LayerUpdates = {
    [LayerUpdateType.EditText]: [],
    [LayerUpdateType.LoadSmartObjectFromUrl]: [],
    [LayerUpdateType.DeleteLayer]: [],
  };

  for (const layer of psd.children) {
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
      layerUpdates[LayerUpdateType.DeleteLayer] = [
        ...layerUpdates[LayerUpdateType.DeleteLayer],
        {
          name: ogLayerName,
          value: ogLayerName, // value is the layer name
        },
      ];
      continue;
    }
    if (layerName.endsWith("start") || layerName.endsWith("end") || layerName.endsWith("date")) {
      layerUpdates[LayerUpdateType.EditText] = [
        ...layerUpdates[LayerUpdateType.EditText],
        {
          name: ogLayerName,
          value: dateFormat ? format(new Date(value), dateFormat.trim()) : value,
        },
      ];
    } else if (layer.placedLayer) {
      const valueSplit = value.split("/");
      // Photoshop always uses the last part of the URL as the layer name.
      const newLayerName = valueSplit[valueSplit.length - 1];
      const index = layerUpdates[LayerUpdateType.LoadSmartObjectFromUrl].length;

      let instagramTag;
      if (layerName.indexOf("staff") !== -1) {
        const split = layerName.split(".");
        split.pop();
        instagramTag = schedules[`${split.join(".")}.instagramHandle`];
      }

      layerUpdates[LayerUpdateType.LoadSmartObjectFromUrl] = [
        ...layerUpdates[LayerUpdateType.LoadSmartObjectFromUrl],
        {
          name: ogLayerName,
          // value is the URL of the image with the index as an anchor. e.g. "https://example.com/image.jpg#0". We do this to uniquely identify the layer.
          value: `${value}#${index}`,
          newLayerName: `${newLayerName}#${index}`,
          ...(instagramTag ? { instagramTag } : {}),
        },
      ];
    } else if (layer.text) {
      layerUpdates[LayerUpdateType.EditText] = [
        ...layerUpdates[LayerUpdateType.EditText],
        {
          name: ogLayerName,
          value, // value is the text content
        },
      ];
    }
  }

  return {
    layerUpdates: layerUpdates,
    layerTranslates: layerUpdates[LayerUpdateType.LoadSmartObjectFromUrl as string].map(
      ({ name, instagramTag, newLayerName }) => ({
        from: newLayerName || name,
        to: name,
        instagramTag,
      }),
    ),
  };
};
