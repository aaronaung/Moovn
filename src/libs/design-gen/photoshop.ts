import { Layer, Psd, readPsd } from "ag-psd";

import { format } from "date-fns";
import {
  DocumentOperationLayer,
  ImageFormatType,
  LayerType,
  PhotoshopClient,
  StorageType,
} from "@adobe/photoshop-apis";
import { adobeAuthConfig } from "@/src/consts/adobe";
import { DailyScheduleSchema } from "../sources/common";

export enum PSDActionType {
  EditText = "editText",
  ReplaceSmartObject = "replaceSmartObject",
}

export type PSDActions = { [key: string]: { [key: string]: string } };

const determinePSDActions = (
  schedule: DailyScheduleSchema,
  psd: Psd,
): PSDActions => {
  if (!psd.children) {
    return {};
  }

  const psdActions: PSDActions = {
    [PSDActionType.EditText]: {},
    [PSDActionType.ReplaceSmartObject]: {},
  };
  const addPsdAction = (layer: Layer, parent?: any) => {
    if (!layer.id || !layer.name) {
      return;
    }
    const [layerName, dateFormat] = layer.name.trim().split("|") || [];
    const value = parent[layerName.trim()];
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
      if (!layerName || index === undefined || !parent) {
        return;
      }
      const newParent = parent[layerName.trim()][index.trim()]; // e.g. parent[events][0] or parent[staff_members][0]
      for (const childLayer of layer.children ?? []) {
        if (!childLayer.name) {
          continue;
        }
        addPsdAction(childLayer, newParent);
      }
    }
  };

  for (const root of psd.children) {
    if (root.name && root.id) {
      addPsdAction(root, schedule);
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
  scheduleData: DailyScheduleSchema;
  inputUrl: string;
  outputUrlPsd: string;
  outputUrlJpeg: string;
}) => {
  const photoshop = new PhotoshopClient(adobeAuthConfig);

  const templateFile = await (await fetch(inputUrl)).blob();

  const psd = readPsd(await templateFile.arrayBuffer());
  const psdActions = determinePSDActions(scheduleData, psd);

  // return psdActions;
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
      ],
    },
  });
};
