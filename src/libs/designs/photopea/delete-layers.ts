import { DeleteLayers } from "../photoshop-v2";

export const deleteLayersCmd = (namespace: string, deleteLayers: DeleteLayers) => `
var doc = app.activeDocument;
var layers = ${JSON.stringify(deleteLayers)}
var loadedLayers = doc.artLayers;

if (loadedLayers && loadedLayers.length > 0) {
  for (var i = 0; i < layers.length; i++) {
    var layer = layers[i];
    try {
      var targetLayer = doc.artLayers.getByName(layer.layerName);
      targetLayer.remove();
    } catch(e) {
      console.error("Error deleting layer " + layer.layerName, e)
    } 
  }
}`;

export const verifyDeleteLayersComplete = (namespace: string, deleteLayers: DeleteLayers) => `
var doc = app.activeDocument;
var layers = ${JSON.stringify(deleteLayers)};
var loadedLayers = doc.artLayers;

function verifyDeleteLayersComplete() {
  for (var i = 0; i < layers.length; i++) {
    var layer = layers[i];
    try {
      var targetLayer = doc.artLayers.getByName(layer.layerName);
      return false;
    } catch(e) {
      // Layer doesn't exist which is what we want. 
      continue;
    }
  }
  return true;
}

if (loadedLayers && loadedLayers.length > 0 && verifyDeleteLayersComplete()) {
  app.echoToOE("delete_layers_complete:${namespace}:true");
} else {
  app.echoToOE("delete_layers_complete:${namespace}:false");
}`;
