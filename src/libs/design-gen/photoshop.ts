import { Layer, Psd, readPsd } from "ag-psd";

import { format } from "date-fns";
import {
  DeleteDetails,
  DocumentOperationLayer,
  ImageFormatType,
  LayerType,
  PhotoshopClient,
  StorageType,
} from "@adobe/photoshop-apis";
import { adobeAuthConfig } from "@/src/consts/adobe";
import { ScheduleData } from "../sources/common";

const photoshop = new PhotoshopClient(adobeAuthConfig);

export enum PSDActionType {
  EditText = "editText",
  ReplaceSmartObject = "replaceSmartObject",
  DeleteLayer = "deleteLayer",
}

export type PSDActions = { [key: string]: { [key: string]: any } };

const determinePSDActions = (schedules: ScheduleData, psd: Psd): PSDActions => {
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
      if (
        layerName === "start_at" ||
        layerName === "end_at" ||
        layerName === "date"
      ) {
        psdActions[PSDActionType.EditText][layer.id] = dateFormat
          ? format(new Date(value), dateFormat.trim())
          : value;
      } else if (layer.placedLayer) {
        psdActions[PSDActionType.ReplaceSmartObject][layer.id] = value;
      } else if (layer.text) {
        psdActions[PSDActionType.EditText][layer.id] = value;
      }
    } else {
      // If value is not provided, it means we are at the parent node. We need to go deeper.
      const [layerName, index] = layer.name.trim().split("#") || [];
      if (!layerName || index === undefined) {
        return;
      }
      const newParent = parentDataObject[layerName.trim()]?.[index.trim()]; // e.g. parent[events][0] or parent[staff_members][0]
      if (!newParent) {
        psdActions[PSDActionType.DeleteLayer][layer.id] = {
          id: layer.id,
          name: layer.name,
          includeChildren: true,
        } as DeleteDetails;
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
    if (!layerName || index === undefined) {
      continue;
    }
    const newParent = (schedules as { [key: string]: any })[layerName.trim()]?.[
      index.trim()
    ];
    if (!newParent) {
      psdActions[PSDActionType.DeleteLayer][root.id] = {
        id: root.id,
        name: root.name,
        includeChildren: true,
      } as DeleteDetails;
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

export const generateDesign = async ({
  scheduleData,
  inputUrl,
  outputUrlPsd,
  outputUrlJpeg,
}: {
  scheduleData: ScheduleData;
  inputUrl: string;
  outputUrlPsd: string;
  outputUrlJpeg: string;
}) => {
  if (scheduleData.schedules.length === 0) {
    return null;
  }

  const templateFile = await (await fetch(inputUrl)).blob();
  const psd = readPsd(await templateFile.arrayBuffer());
  const psdActions = determinePSDActions(scheduleData, psd);

  return photoshop.modifyDocument({
    inputs: [
      {
        href: inputUrl,
        storage: StorageType.EXTERNAL,
      },
    ],
    outputs: [
      {
        href: outputUrlJpeg,
        storage: StorageType.EXTERNAL,
        type: ImageFormatType.IMAGE_JPEG,
      },
      {
        href: outputUrlPsd,
        storage: StorageType.EXTERNAL,
        type: ImageFormatType.IMAGE_VND_ADOBE_PHOTOSHOP,
      },
    ],
    options: {
      layers: [
        ...Object.keys(psdActions[PSDActionType.ReplaceSmartObject]).map(
          (layerId) =>
            ({
              edit: {},
              type: LayerType.SMART_OBJECT,
              id: Number(layerId),
              input: {
                href: psdActions[PSDActionType.ReplaceSmartObject][
                  Number(layerId)
                ],
                storage: StorageType.EXTERNAL,
              },
            }) as DocumentOperationLayer,
        ),
        ...Object.keys(psdActions[PSDActionType.EditText]).map(
          (layerId) =>
            ({
              edit: {},
              type: LayerType.TEXT_LAYER,
              id: Number(layerId),
              text: {
                content: psdActions[PSDActionType.EditText][Number(layerId)],
              },
            }) as DocumentOperationLayer,
        ),
        ...Object.values(psdActions[PSDActionType.DeleteLayer]).map(
          (deleteDetails) => {
            return {
              delete: {
                includeChildren: deleteDetails.includeChildren,
              },
              id: deleteDetails.id,
            } as DocumentOperationLayer;
          },
        ),
      ],
    },
  });
};
