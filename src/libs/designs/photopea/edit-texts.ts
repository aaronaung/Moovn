import { EditTexts } from "../photoshop-v2";

export const editTextsCmd = (namespace: string, editTexts: EditTexts) => `
var doc = app.activeDocument;
var layers = ${JSON.stringify(editTexts)}
var loadedLayers = doc.artLayers;

if (loadedLayers && loadedLayers.length > 0) {
  for (var i = 0; i < layers.length; i++) {
    var layer = layers[i];
    try {
      var targetLayer = doc.artLayers.getByName(layer.layerName);
      if (targetLayer.kind == LayerKind.TEXT) {
        targetLayer.textItem.contents = layer.value;
      } 
    } catch(e) {
      console.error("Error editing text layer " + layer.layerName, e)
    }
  }
}`;

export const verifyEditTextsComplete = (namespace: string, editTexts: EditTexts) => `
var doc = app.activeDocument;
var layers = ${JSON.stringify(editTexts)};
var loadedLayers = doc.artLayers;

function verifyEditTextsComplete() {
  for (var i = 0; i < layers.length; i++) {
    var layer = layers[i];
    try {
      var targetLayer = doc.artLayers.getByName(layer.layerName);
      if (targetLayer.kind == LayerKind.TEXT && targetLayer.textItem.contents == layer.value) {
        continue;
      }
      return false;
    } catch(e) {
      return false;
    }
  }
  return true;
}

if (loadedLayers && loadedLayers.length > 0 && verifyEditTextsComplete()) {
  app.echoToOE("edit_texts_complete:${namespace}:true");
}`;
