"use client";

import { Layer, Psd, readPsd } from "ag-psd";
const printTextLayers = (psd: Psd) => {
  if (!psd.children) {
    return {};
  }

  // parentDataObject is a reference to a nested/sub-object in the schedules data that can be accessed using the Layer name.
  const print = (layer: Layer, parentName: string) => {
    if (!layer.id || !layer.name) {
      return;
    }

    // If value is provided, it means we are at the leaf node.
    if (layer.text && parentName.startsWith("events")) {
      console.log(`${parentName}.${layer.name}`, layer);
    } else {
      // If value is not provided, it means we are at the parent node. We need to go deeper.
      const [layerName, index] = layer.name.trim().split("#") || [];
      const _index = Number(index?.trim()) - 1; // customer readable index starts at 1.
      if (!layerName || index === undefined || isNaN(_index) || _index < 0) {
        return;
      }

      for (const childLayer of layer.children ?? []) {
        if (!childLayer.name || !childLayer.id) {
          continue;
        }
        print(childLayer, layer.name);
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
    // e.g. schedules#0 or schedules#1
    for (const childLayer of root.children ?? []) {
      if (!childLayer.name || !childLayer.id) {
        continue;
      }
      print(childLayer, root.name);
    }
  }
  return;
};

export default function Playground() {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) {
      return;
    }
    const fileData = await fileList[0].arrayBuffer();
    const psdData = readPsd(fileData);

    printTextLayers(psdData);
  };

  return (
    <div>
      <input type={"file"} onChange={handleFileChange}></input>
    </div>
  );
}
