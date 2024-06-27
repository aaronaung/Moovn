import { Layer, Psd } from "ag-psd";

import { format } from "date-fns";

export enum PSDActionType {
  EditText = "editText",
  ReplaceSmartObject = "replaceSmartObject",
  DeleteLayer = "deleteLayer",
}

export type PSDActions = {
  [key: string]: {
    [key: string]: {
      value?: any;
      layer: Layer;
    };
  };
};

export const determinePSDActions = (schedules: any, psd: Psd): PSDActions => {
  if (!psd.children) {
    return {};
  }

  const psdActions: PSDActions = {
    [PSDActionType.EditText]: {},
    [PSDActionType.ReplaceSmartObject]: {},
    [PSDActionType.DeleteLayer]: {},
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
      psdActions[PSDActionType.DeleteLayer][ogLayerName] = {
        layer,
        value,
      };
      continue;
    }
    if (layerName.endsWith("start_at") || layerName.endsWith("end_at") || layerName.endsWith("date")) {
      psdActions[PSDActionType.EditText][ogLayerName] = {
        layer,
        value: dateFormat ? format(new Date(value), dateFormat.trim()) : value,
      };
    } else if (layer.placedLayer) {
      psdActions[PSDActionType.ReplaceSmartObject][ogLayerName] = {
        layer,
        value,
      };
    } else if (layer.text) {
      psdActions[PSDActionType.EditText][ogLayerName] = {
        value,
        layer,
      };
    }
  }
  return psdActions;
};
