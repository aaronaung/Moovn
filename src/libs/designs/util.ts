import { Psd, Layer } from "ag-psd";
import { format } from "date-fns";
import { ScheduleData } from "../sources/common";
import { MD5 as hash } from "object-hash";

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

export const determinePSDActions = (schedules: ScheduleData, psd: Psd): PSDActions => {
  if (!psd.children) {
    return {};
  }

  const psdActions: PSDActions = {
    [PSDActionType.EditText]: {},
    [PSDActionType.ReplaceSmartObject]: {},
    [PSDActionType.DeleteLayer]: {},
  };

  // parentDataObject is a reference to a nested/sub-object in the schedules data that can be accessed using the Layer name.
  const addPsdAction = (layer: Layer, parentDataObject?: any) => {
    if (!layer.id || !layer.name) {
      return;
    }
    const [layerName, dateFormat] = layer.name.trim().split("|") || [];
    const value = parentDataObject?.[layerName.trim()];
    if (value) {
      // If value is provided, it means we are at the leaf node.
      if (layerName === "start_at" || layerName === "end_at" || layerName === "date") {
        psdActions[PSDActionType.EditText][layer.id] = {
          layer,
          value: dateFormat ? format(new Date(value), dateFormat.trim()) : value,
        };
      } else if (layer.placedLayer) {
        psdActions[PSDActionType.ReplaceSmartObject][layer.id] = {
          layer,
          value,
        };
      } else if (layer.text) {
        psdActions[PSDActionType.EditText][layer.id] = {
          value,
          layer,
        };
      }
    } else {
      // If value is not provided, it means we are at the parent node. We need to go deeper.
      const [layerName, index] = layer.name.trim().split("#") || [];
      const _index = Number(index?.trim()) - 1; // customer readable index starts at 1.
      if (!layerName || index === undefined || isNaN(_index) || _index < 0) {
        return;
      }
      const newParent = parentDataObject[layerName.trim()]?.[_index]; // e.g. parent[events][0] or parent[staff_members][0]
      if (!newParent) {
        psdActions[PSDActionType.DeleteLayer][layer.id] = {
          layer,
        };
        return;
      }
      for (const childLayer of layer.children ?? []) {
        if (!childLayer.name || !childLayer.id) {
          continue;
        }
        addPsdAction(childLayer, newParent);
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

    const newParent = (schedules as { [key: string]: any })[layerName.trim()]?.[_index];
    if (!newParent) {
      psdActions[PSDActionType.DeleteLayer][root.id] = {
        layer: root,
      };
      continue;
    }
    // e.g. schedules#0 or schedules#1
    for (const childLayer of root.children ?? []) {
      if (!childLayer.name || !childLayer.id) {
        continue;
      }
      addPsdAction(childLayer, newParent);
    }
  }
  return psdActions;
};

export const generateDesignHash = (templateId: string, data: any) => hash({ templateId, data });
