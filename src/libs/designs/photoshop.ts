import { Psd } from "ag-psd";

import {
  DocumentOperationLayer,
  ImageFormatType,
  LayerType,
  PhotoshopClient,
  StorageType,
} from "@adobe/photoshop-apis";
import { adobeAuthConfig } from "@/src/consts/adobe";
import { ScheduleData } from "../sources";
import { determinePSDActions, PSDActionType } from "./util";

const photoshop = new PhotoshopClient(adobeAuthConfig);

export const generateDesign = async ({
  scheduleData,
  inputUrl,
  inputPsd,
  outputUrlPsd,
  outputUrlJpeg,
}: {
  scheduleData: ScheduleData;
  inputUrl: string;
  inputPsd: Psd;
  outputUrlPsd: string;
  outputUrlJpeg: string;
}) => {
  if (scheduleData.schedules.length === 0) {
    return null;
  }
  const psdActions = determinePSDActions(scheduleData, inputPsd);

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
        ...Object.values(psdActions[PSDActionType.ReplaceSmartObject]).map(({ layer, value }) => {
          return {
            edit: {},
            type: LayerType.SMART_OBJECT,
            id: Number(layer.id),
            input: {
              href: value,
              storage: StorageType.EXTERNAL,
            },
          } as DocumentOperationLayer;
        }),
        ...Object.values(psdActions[PSDActionType.EditText]).map(({ layer, value }) => {
          return {
            edit: {},
            type: LayerType.TEXT_LAYER,
            id: Number(layer.id),
            text: {
              content: value,
            },
            // ...(layer.text?.shapeType === "box"
            //   ? {
            //       bounds: {
            //         top: layer?.top || 0,
            //       },
            //     }
            //   : {}),
          } as DocumentOperationLayer;
        }),
        ...Object.values(psdActions[PSDActionType.DeleteLayer]).map(({ layer }) => {
          return {
            delete: {
              includeChildren: true,
            },
            id: layer.id,
          } as DocumentOperationLayer;
        }),
      ],
    },
  });
};
