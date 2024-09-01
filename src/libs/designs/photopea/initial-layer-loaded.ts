export const verifyInitialLayerLoaded = (namespace: string) => `
var doc = app.activeDocument;
var layers = doc.artLayers;
if (layers && layers.length > 0) {
  app.echoToOE("initial_layer_loaded:${namespace}");
}`;
