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

      var source;
      var target;
      try {
        source = doc.artLayers.getByName(sourceName);
        target = doc.artLayers.getByName(targetName);
      } catch(e) {
        // It's likely that the source layer has been renamed to the target layer. 

        try {
          source = doc.artLayers.getByName(targetName);

          // If the source layer is the same as the target layer, this means the layer has been replaced. 
          continue; 

        } catch(e) {
          console.error("Error getting source and target layer for replace step: ${namespace}", e)
        }
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

        // Calculate the translation distances
        var translateX = targetCenterX - sourceCenterX;
        var translateY = targetTop - sourceTop;

        // Move and translate the 'source' layer
        source.move(target, ElementPlacement.PLACEBEFORE);
        source.translate(translateX, translateY);

        // Perform scaling if the source layer is not the same size as the target layer
        var sWidth = sourceRight - sourceLeft;
        var sHeight = sourceBottom - sourceTop;

        var tWidth = targetRight - targetLeft;
        var tHeight = targetBottom - targetTop; // We use the top of the target layer to align the source layer so we don't miss the head in the headshots.
        
        var scaleFactor = Math.max(tWidth / sWidth, tHeight / sHeight) * 100;  
        source.resize(scaleFactor, scaleFactor, AnchorPosition.MIDDLECENTER);

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

export const cropImagesCmd = (namespace: string, replaceLayers: ReplaceLayers) => `
var doc = app.activeDocument;
var layers = ${JSON.stringify(replaceLayers)};
console.log("cropping layers", layers);
var loadedLayers = doc.artLayers;

if (loadedLayers && loadedLayers.length > 0) {
  try {
    for (var i = 0; i < layers.length; i++) {
      var sourceName = layers[i].sourceLayerName;
      var targetName = layers[i].targetLayerName;
      
      var source = doc.artLayers.getByName(sourceName);
      var target = doc.artLayers.getByName(targetName);

      if (source && target) {
        var sourceLeft = source.bounds[0].value;
        var sourceTop = source.bounds[1].value;
        var sourceRight = source.bounds[2].value;
        var sourceBottom = source.bounds[3].value;

        var targetLeft = target.bounds[0].value;
        var targetTop = target.bounds[1].value;
        var targetRight = target.bounds[2].value;
        var targetBottom = target.bounds[3].value;
      
        if (sourceBottom > targetBottom) {
          doc.activeLayer = source;
          doc.selection.select([
            [targetLeft, targetBottom],
            [targetRight, targetBottom],
            [sourceRight, sourceBottom],
            [sourceLeft, sourceBottom]
          ]);
          doc.selection.clear();
          doc.selection.deselect();
        }
        source.name = target.name;
        target.remove();
      } 
    }
  } catch(e) {
    console.error("Error cropping layers", e)
  }   
}
app.echoToOE("crop_images_complete:${namespace}:true");
`;

export const verifyReplaceLayersComplete = (namespace: string, replaceLayers: ReplaceLayers) => `
var doc = app.activeDocument;
var layers = ${JSON.stringify(replaceLayers)};
var loadedLayers = doc.artLayers;

function checkLayerTranslatesComplete() {
  for (var i = 0; i < layers.length; i++) {
    var sourceName = layers[i].sourceLayerName;
    var targetName = layers[i].targetLayerName;
    
    var source;
    var target;
    try {
      source = doc.artLayers.getByName(sourceName);
      target = doc.artLayers.getByName(targetName);
    } catch(e) {
      // It's likely that the source layer has been renamed to the target layer. 

      try {
        source = doc.artLayers.getByName(targetName);

        // If the source layer is the same as the target layer, this means the layer has been replaced. 
        continue; 

      } catch(e) {
        console.error("Error getting source and target layer for replace step: ${namespace}", e)
      }
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
      console.log('verifying replace layers: ${namespace}', {
        sourceCenterX, sourceCenterY, targetCenterX, targetCenterY
      });
      // Check if the current position of 'source' matches the 'to' position
      if (Math.abs(sourceCenterX - targetCenterX) < 10 && Math.abs(sourceTop - targetTop) < 10) {
        // source.name = target.name;
        // target.remove();
      } else {
        console.log("source layer position not equal to target layer position", {
          sourceCenterX, sourceTop, targetCenterX, targetTop
        });
        return false;
      }
    } else {
      // If source or target layers are not found, we can assume the layer has been replaced.
      console.log("source or/and target layers not found", { source, target });
      return true;
    }
  }
  return true;
}

if (loadedLayers && loadedLayers.length > 0 && checkLayerTranslatesComplete()) {
  app.echoToOE("replace_layers_complete:${namespace}:true");
} else {
  app.echoToOE("replace_layers_complete:${namespace}:false");
}
`;
