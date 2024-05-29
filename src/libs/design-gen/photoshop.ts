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
  const eventIndexMap = Object.assign({}, schedule.events);

  if (!psd.children) {
    return {};
  }

  const psdActions: PSDActions = {
    [PSDActionType.EditText]: {},
    [PSDActionType.ReplaceSmartObject]: {},
  };
  const addPsdAction = (layer: Layer, value?: any) => {
    if (!layer.id || !layer.name || !value) {
      return;
    }
    if (layer.placedLayer) {
      psdActions[PSDActionType.ReplaceSmartObject][layer.id] = value;
    }
    if (layer.text) {
      psdActions[PSDActionType.EditText][layer.id] = value;
    }
  };

  for (const root of psd.children) {
    if (root.name === "date" && root.id) {
      psdActions[PSDActionType.EditText][root.id] = schedule.date; // todo - add formating
    }
    if (root.name === "day" && root.id) {
      psdActions[PSDActionType.EditText][root.id] = format(
        new Date(schedule.date),
        "EEEE",
      );
    }

    const [layerName, index] = (root.name || "").split("#") || [];
    if (!layerName || index === undefined) {
      continue;
    }
    if (layerName === "events") {
      const event: { [key: string]: any } = eventIndexMap[parseInt(index)];

      for (const eventLayer of root.children ?? []) {
        if (eventLayer.name) {
          addPsdAction(eventLayer, event[eventLayer.name]);
        }
        const [layerName, index] = (eventLayer.name || "").split("#") || [];
        if (!layerName || index === undefined) {
          continue;
        }
        if (layerName === "staff_members") {
          const staffMember = event.staff_members[parseInt(index)];
          for (const staffLayer of eventLayer.children ?? []) {
            if (staffLayer.name) {
              addPsdAction(staffLayer, staffMember[staffLayer.name]);
            }
          }
        }
      }
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
