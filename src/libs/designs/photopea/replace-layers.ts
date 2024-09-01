import { ReplaceLayers } from "../photoshop-v2";

export const replaceLayersCmd = (namespace: string, replaceLayers: ReplaceLayers) => `
var doc = app.activeDocument;
var layers = ${JSON.stringify(replaceLayers)}
var loadedLayers = doc.artLayers;
var instagramTags = [];

if (loadedLayers && loadedLayers.length > 0) {
  try {
    for (var i = 0; i < layers.length; i++) {
      var sourceName = layers[i].sourceLayerName;
      var targetName = layers[i].targetLayerName;
      var instagramTag = layers[i].instagramTag;

      var source = doc.artLayers.getByName(sourceName);
      var target = doc.artLayers.getByName(targetName);

      if (source && target) {
        // Calculate the center of the 'target' layer
        var targetLeft = target.bounds[0].value;
        var targetTop = target.bounds[1].value;
        var targetRight = target.bounds[2].value;
        var targetBottom = target.bounds[3].value;
        var targetCenterX = (targetLeft + targetRight) / 2;
        var targetCenterY = (targetTop + targetBottom) / 2;

        // Calculate the center of the 'source' layer
        var sourceLeft = source.bounds[0].value;
        var sourceTop = source.bounds[1].value;
        var sourceRight = source.bounds[2].value;
        var sourceBottom = source.bounds[3].value;
        var sourceCenterX = (sourceLeft + sourceRight) / 2;
        var sourceCenterY = (sourceTop + sourceBottom) / 2;

        // Calculate the translation distances
        var translateX = targetCenterX - sourceCenterX;
        var translateY = targetCenterY - sourceCenterY;

        // Move and translate the 'source' layer
        source.move(target, ElementPlacement.PLACEBEFORE);
        source.translate(translateX, translateY);

        // Perform scaling if the source layer is not the same size as the target layer
        var sWidth = sourceRight - sourceLeft;
        var sHeight = sourceBottom - sourceTop;

        var tWidth = targetRight - targetLeft;
        var tHeight = targetBottom - targetTop;
        
        var scaleFactor = Math.max(tWidth / sWidth, tHeight / sHeight) * 100;  
        source.resize(scaleFactor, scaleFactor, AnchorPosition.MIDDLECENTER);

        // Perform clipping mask
        source.grouped = true;

        // Calculate the relative position of the instagramTag
        var docWidth = doc.width;
        var docHeight = doc.height;
        var instagramTagX = targetCenterX / docWidth;
        var instagramTagY = targetCenterY / docHeight;

        // Collect the instagramTag position
        instagramTags.push({
            x: instagramTagX, 
            y: instagramTagY,
            username: instagramTag
        });
      }
    }
    var b64 = btoa(JSON.stringify(instagramTags));
    app.echoToOE("instagram_tag_positions:${namespace}:" + b64);
  } catch(e) {
    console.error("Error replacing layers", e)
  }
}`;

export const verifyReplaceLayersComplete = (namespace: string, replaceLayers: ReplaceLayers) => `
var doc = app.activeDocument;
var layers = ${JSON.stringify(replaceLayers)};
var loadedLayers = doc.artLayers;

function checkLayerTranslatesComplete() {
  for (var i = 0; i < layers.length; i++) {
    var sourceName = layers[i].sourceLayerName;
    var targetName = layers[i].targetLayerName;

    try {
      var source = doc.artLayers.getByName(sourceName);
      var target = doc.artLayers.getByName(targetName);
    } catch(e) {
      console.error("Error getting layers for translation", e)
    }

    if (source && target) {
      // Calculate the center of the 'target' layer
      var targetLeft = target.bounds[0].value;
      var targetTop = target.bounds[1].value;
      var targetRight = target.bounds[2].value;
      var targetBottom = target.bounds[3].value;
      var targetCenterX = (targetLeft + targetRight) / 2;
      var targetCenterY = (targetTop + targetBottom) / 2;

      // Calculate the center of the 'source' layer
      var sourceLeft = source.bounds[0].value;
      var sourceTop = source.bounds[1].value;
      var sourceRight = source.bounds[2].value;
      var sourceBottom = source.bounds[3].value;
      var sourceCenterX = (sourceLeft + sourceRight) / 2;
      var sourceCenterY = (sourceTop + sourceBottom) / 2;

      // Check if the current position of 'source' matches the 'to' position
      if (Math.abs(sourceCenterX - targetCenterX) < 2 && Math.abs(sourceCenterY - targetCenterY) < 2) {
        source.name = target.name;
        // target.remove();
      } else {
        return;
      }
    } else {
      return;
    }
  }
  app.echoToOE("replace_layers_complete:${namespace}");
}

try {
  checkLayerTranslatesComplete();
} catch(e) {
  console.error("Error checking layer translates", err)
}`;
