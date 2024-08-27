import { DesignGenSteps, LayerTranslates, LayerUpdates, LayerUpdateType } from "./photoshop-v2";

export const getLayerCountCmd = (namespace: string) => `
var doc = app.activeDocument;
var layers = doc.artLayers;
if (layers && layers.length > 0) {
    app.echoToOE("layer_count:${namespace}:" + layers.length);
}
`;

export const checkLayerUpdatesComplete = (namespace: string, designGenSteps: DesignGenSteps) => `
var doc = app.activeDocument;
var layers = ${JSON.stringify(designGenSteps.layerUpdates)};
var loadedLayers = doc.artLayers;

function areLayersUpdated() {
    for (var i = 0; i < layers.${LayerUpdateType.EditText}.length; i++) {
        var layer = layers.${LayerUpdateType.EditText}[i];
        try {
            var targetLayer = doc.artLayers.getByName(layer.name);
            if (targetLayer.kind == LayerKind.TEXT) {
                if (targetLayer.textItem.contents != layer.value) {
                    return false;
                }
            }
        } catch(e) {
            console.error("Error checking if text layer is edited " + layer.name, e) 
            return false;
        }
    }

    // Ensure delete layers
    for (var i = 0; i < layers.${LayerUpdateType.DeleteLayer}.length; i++) {
        var layer = layers.${LayerUpdateType.DeleteLayer}[i];

        try {
            var targetLayer = doc.artLayers.getByName(layer.name);
            if (targetLayer != null) {
                return false;
            }
        } catch(e) {
            // Layer doesn't exist which is what we want. 
        }
    }

    // Ensure load smart objects
    for (var i = 0; i < layers.${LayerUpdateType.LoadSmartObjectFromUrl}.length; i++) {
        var layer = layers.${LayerUpdateType.LoadSmartObjectFromUrl}[i];
        try {
            var targetLayer = doc.artLayers.getByName(layer.newLayerName);
            if (!targetLayer) {
                loadSmartObjectValid = false;
                return false;
            }
        } catch(e) {
            console.error("Error checking if smart object is loaded " + layer.newLayerName, e)
            return false;
        }
    }
    return true;
}

if (loadedLayers && loadedLayers.length > 0 && areLayersUpdated()) {
    app.echoToOE("layer_updates_complete:${namespace}");
}
`;

export const updateLayersCmd = (updateActions: LayerUpdates) => `
// Get the active document
var doc = app.activeDocument;

var layers = ${JSON.stringify(updateActions)}
var loadedLayers = doc.artLayers;

if (loadedLayers && loadedLayers.length > 0) {
    // Edit text layers
    for (var i = 0; i < layers.${LayerUpdateType.EditText}.length; i++) {
        var layer = layers.${LayerUpdateType.EditText}[i];
        try {
            var targetLayer = doc.artLayers.getByName(layer.name);
            if (targetLayer.kind == LayerKind.TEXT) {
                targetLayer.textItem.contents = layer.value;
            } 
        } catch(e) {
            console.error("Error editing text layer " + layer.name, e)
        }
        
    }

    // Delete layers
    for (var i = 0; i < layers.${LayerUpdateType.DeleteLayer}.length; i++) {
        var layer = layers.${LayerUpdateType.DeleteLayer}[i];
        try {
            var targetLayer = doc.artLayers.getByName(layer.name);
            targetLayer.remove();
        } catch(e) {
            console.error("Error deleting layer " + layer.name, e)
        }
        
    }

    // Replace smart objects
    for (var i = 0; i < layers.${LayerUpdateType.LoadSmartObjectFromUrl}.length; i++) {
        var layer = layers.${LayerUpdateType.LoadSmartObjectFromUrl}[i];
        try {
            if (layer.value == ""){
                continue;
            }
            app.open(layer.value,null,true)
        } catch(e) {
            console.error("Error loading smart object " + layer.name, e)
        }
    }
}
`;

export const checkLayerTranslatesComplete = (
  namespace: string,
  layerTranslates: LayerTranslates,
) => `
var doc = app.activeDocument;
var layers = ${JSON.stringify(layerTranslates)};

function checkLayerTranslatesComplete() {
    for (var i = 0; i < layers.length; i++) {
        var fromName = layers[i].from;
        var toName = layers[i].to;

        try {
            var from = doc.artLayers.getByName(fromName);
            var to = doc.artLayers.getByName(toName);
        } catch(e) {
            console.error("Error getting layers for translation", e)
        }

        if (from && to) {
            // Calculate the center of the 'to' layer
            var toLeft = to.bounds[0].value;
            var toTop = to.bounds[1].value;
            var toRight = to.bounds[2].value;
            var toBottom = to.bounds[3].value;
            var toCenterX = (toLeft + toRight) / 2;
            var toCenterY = (toTop + toBottom) / 2;

            // Calculate the center of the 'from' layer
            var fromLeft = from.bounds[0].value;
            var fromTop = from.bounds[1].value;
            var fromRight = from.bounds[2].value;
            var fromBottom = from.bounds[3].value;
            var fromCenterX = (fromLeft + fromRight) / 2;
            var fromCenterY = (fromTop + fromBottom) / 2;

            // Check if the current position of 'from' matches the 'to' position
            if (Math.abs(fromCenterX - toCenterX) > 2 || Math.abs(fromCenterY - toCenterY) > 2) {
                console.log("no need to translate - position already close enough to the target position", {
                    fromCenterX,
                    toCenterX,
                    fromCenterY,
                    toCenterY
                })
                continue;
            } else {
                from.name = to.name;
                to.remove();
            }
        } else {
            return;
        }
    }
    app.echoToOE("layer_translates_complete:${namespace}");
}

try {
    checkLayerTranslatesComplete();
} catch(e) {
    console.error("Error checking layer translates", err)
}
`;

export const translateLayersCmd = (namespace: string, layerTranslates: LayerTranslates) => `
var doc = app.activeDocument;
var layers = ${JSON.stringify(layerTranslates)};
var instagramTags = [];

try {
    for (var i = 0; i < layers.length; i++) {
        var fromName = layers[i].from;
        var toName = layers[i].to;
        var instagramTag = layers[i].instagramTag;

        var from = doc.artLayers.getByName(fromName);
        var to = doc.artLayers.getByName(toName);

        if (from && to) {
            // Calculate the center of the 'to' layer
            var toLeft = to.bounds[0].value;
            var toTop = to.bounds[1].value;
            var toRight = to.bounds[2].value;
            var toBottom = to.bounds[3].value;
            var toCenterX = (toLeft + toRight) / 2;
            var toCenterY = (toTop + toBottom) / 2;

            // Calculate the center of the 'from' layer
            var fromLeft = from.bounds[0].value;
            var fromTop = from.bounds[1].value;
            var fromRight = from.bounds[2].value;
            var fromBottom = from.bounds[3].value;
            var fromCenterX = (fromLeft + fromRight) / 2;
            var fromCenterY = (fromTop + fromBottom) / 2;

            // Calculate the translation distances
            var translateX = toCenterX - fromCenterX;
            var translateY = toCenterY - fromCenterY;

            // Move and translate the 'from' layer
            from.move(to, ElementPlacement.PLACEBEFORE);
            from.translate(translateX, translateY);

            // Calculate the relative position of the instagramTag
            var docWidth = doc.width;
            var docHeight = doc.height;
            var instagramTagX = toCenterX / docWidth;
            var instagramTagY = toCenterY / docHeight;

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
    console.error("Error translating layers", e)
}
`;

export type InstagramTag = {
  username: string;
  x: number;
  y: number;
};

export const exportCmd = (namespace: string) => `
app.activeDocument.saveToOE("jpg");
app.echoToOE("export_file:${namespace}:jpg");

app.activeDocument.saveToOE("psd");
app.echoToOE("export_file:${namespace}:psd");
`;

export const addHeadlessPhotopeaToDom = () => {
  const iframeSrc = `https://www.photopea.com#${JSON.stringify({
    environment: {
      vmode: 2,
      intro: false,
    },
  })}`;
  const photopeaEl = document.createElement("iframe");
  photopeaEl.src = iframeSrc;
  photopeaEl.className = "hidden";
  document.body.appendChild(photopeaEl);
  return photopeaEl;
};
