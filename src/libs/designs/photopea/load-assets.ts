import { LoadAsset } from "../photoshop-v2";

export const moveAndRenameLoadedAssetCmd = (loadAsset: LoadAsset) => `
try {
  var loadedAssetLayer = app.activeDocument.activeLayer;
  
  var targetDoc = app.documents[0];
  loadedAssetLayer.duplicate(targetDoc, ElementPlacement.PLACEATBEGINNING);
  app.activeDocument = targetDoc;
  app.activeDocument.activeLayer.name = "${loadAsset.layerName}";
} catch(err) {
  console.error("Error setting loaded asset layer name", err)
}`;

export const focusDocZero = () => `
try {
  app.activeDocument = app.documents[0];
} catch(err) {
  console.error("Error focusing doc zero", err)
}`;

export const verifyLoadAssetsComplete = (
  namespace: string,
  loadAssets: { layerName: string }[],
) => `
var doc = app.activeDocument;
var layers = ${JSON.stringify(loadAssets)};
var loadedLayers = doc.artLayers;

function verifyLoadAssetsComplete() {
  for (var i = 0; i < layers.length; i++) {
    var layer = layers[i];
    try {
      var targetLayer = loadedLayers.getByName(layer.layerName);
      if (!targetLayer) {
        return false;
      }
      continue;
    } catch(e) {
      return false;
    }
  }
  return true;
}

try {
  if (loadedLayers && loadedLayers.length > 0 && verifyLoadAssetsComplete()) {
    app.echoToOE("load_assets_complete:${namespace}");
  }
} catch(err) {
  console.error("Error verifying load assets complete", err)
}`;
