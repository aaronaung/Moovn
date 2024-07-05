import { Psd } from "ag-psd";

import { format } from "date-fns";

export enum PSDActionType {
  EditText = "editText",
  LoadSmartObjectFromUrl = "loadSmartObjectFromUrl",
  DeleteLayer = "deleteLayer",
}

export type PSDActions = {
  [key: string]: {
    value: any;
    name: string;
    newLayerName?: string; // Only used for LoadSmartObjectFromUrl
  }[];
};

export const determinePSDActions = (
  schedules: any,
  psd: Psd,
): { edits: PSDActions; translates: { from: string; to: string }[] } => {
  if (!psd.children) {
    return {
      edits: {},
      translates: [],
    };
  }

  const psdActions: PSDActions = {
    [PSDActionType.EditText]: [],
    [PSDActionType.LoadSmartObjectFromUrl]: [],
    [PSDActionType.DeleteLayer]: [],
  };

  for (const layer of psd.children) {
    if (!layer.name || !layer.id) {
      continue;
    }
    const ogLayerName = layer.name;

    const [layerName, dateFormat] = layer.name.trim().split("|") || [];
    const value = schedules[layerName];

    if (!layerName.startsWith("schedules")) {
      // Skip if the layer name does not start with "schedules". We don't want to
      // replace the layer if it's not a schedule layer.
      continue;
    }
    if (!value) {
      psdActions[PSDActionType.DeleteLayer] = [
        ...psdActions[PSDActionType.DeleteLayer],
        {
          name: ogLayerName,
          value: ogLayerName, // value is the layer name
        },
      ];
      continue;
    }
    if (layerName.endsWith("start_at") || layerName.endsWith("end_at") || layerName.endsWith("date")) {
      psdActions[PSDActionType.EditText] = [
        ...psdActions[PSDActionType.EditText],
        {
          name: ogLayerName,
          value: dateFormat ? format(new Date(value), dateFormat.trim()) : value,
        },
      ];
    } else if (layer.placedLayer) {
      const valueSplit = value.split("/");
      // Photoshop always uses the last part of the URL as the layer name.
      const newLayerName = valueSplit[valueSplit.length - 1];
      const index = psdActions[PSDActionType.LoadSmartObjectFromUrl].length;

      psdActions[PSDActionType.LoadSmartObjectFromUrl] = [
        ...psdActions[PSDActionType.LoadSmartObjectFromUrl],
        {
          name: ogLayerName,

          // value is the URL of the image with the index as an anchor. e.g. "https://example.com/image.jpg#0". We do this to uniquely identify the layer.
          value: `${value}#${index}`,
          newLayerName: `${newLayerName}#${index}`,
        },
      ];
    } else if (layer.text) {
      psdActions[PSDActionType.EditText] = [
        ...psdActions[PSDActionType.EditText],
        {
          name: ogLayerName,
          value, // value is the text content
        },
      ];
    }
  }

  return {
    edits: psdActions,
    translates: psdActions[PSDActionType.LoadSmartObjectFromUrl as string].map(({ name, newLayerName }) => ({
      from: newLayerName || name,
      to: name,
    })),
  };
};
