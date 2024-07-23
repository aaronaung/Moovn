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

var editTextValid = true;
var deleteLayerValid = true;
var loadSmartObjectValid = true;
for (var i = 0; i < layers.${LayerUpdateType.EditText}.length; i++) {
    var layer = layers.${LayerUpdateType.EditText}[i];
    var targetLayer = doc.artLayers.getByName(layer.name);

    if (targetLayer.kind == LayerKind.TEXT) {
        if (targetLayer.textItem.contents != layer.value) {
            console.log("failed: EditText ${namespace}")
            editTextValid = false;
        }
    }
}

// Ensure delete layers
for (var i = 0; i < layers.${LayerUpdateType.DeleteLayer}.length; i++) {
    var layer = layers.${LayerUpdateType.DeleteLayer}[i];
    try {
        var targetLayer = doc.artLayers.getByName(layer.name);
        if (targetLayer != null) {
            deleteLayerValid = false;
        }
    } catch (e) {
      
    }
}

// Ensure load smart objects
for (var i = 0; i < layers.${LayerUpdateType.LoadSmartObjectFromUrl}.length; i++) {
    var layer = layers.${LayerUpdateType.LoadSmartObjectFromUrl}[i];
    var targetLayer = doc.artLayers.getByName(layer.newLayerName);
    if (!targetLayer) {
        console.log("failed: LoadSmartObject ${namespace}")
        loadSmartObjectValid = false;
    }
}

if (editTextValid && deleteLayerValid && loadSmartObjectValid) {
    console.log("echoing layer_updates_complete:${namespace}")
    app.echoToOE("layer_updates_complete:${namespace}");
}
`;

export const updateLayersCmd = (updateActions: LayerUpdates) => `
// Get the active document
var doc = app.activeDocument;

var layers = ${JSON.stringify(updateActions)}

// Edit text layers
for (var i = 0; i < layers.${LayerUpdateType.EditText}.length; i++) {
    var layer = layers.${LayerUpdateType.EditText}[i];
    var targetLayer = doc.artLayers.getByName(layer.name);

    if (targetLayer.kind == LayerKind.TEXT) {
        targetLayer.textItem.contents = layer.value;
    } else {
        console.log("The specified layer is not a text layer.");
    }
}

// Delete layers
for (var i = 0; i < layers.${LayerUpdateType.DeleteLayer}.length; i++) {
    var layer = layers.${LayerUpdateType.DeleteLayer}[i];
    var targetLayer = doc.artLayers.getByName(layer.name);
    targetLayer.remove();
}

// Replace smart objects
for (var i = 0; i < layers.${LayerUpdateType.LoadSmartObjectFromUrl}.length; i++) {
    var layer = layers.${LayerUpdateType.LoadSmartObjectFromUrl}[i];
    if (layer.value == ""){
        continue;
    }
    app.open(layer.value,null,true)
}
`;

export const checkTranslateLayersComplete = (
  namespace: string,
  layerTranslates: LayerTranslates,
) => `
var doc = app.activeDocument;
var layers = ${JSON.stringify(layerTranslates)};

function checkTranslateLayersComplete() {
    for (var i = 0; i < layers.length; i++) {
        var fromName = layers[i].from;
        var toName = layers[i].to;

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

            // Check if the current position of 'from' matches the 'to' position
            if (fromCenterX !== toCenterX || fromCenterY !== toCenterY) {
                return;
            }
        } else {
            return;
        }
    }
    app.echoToOE("translate_layers_complete:${namespace}:true");
}

checkTranslateLayersComplete();
`;

export const translateLayersCmd = (layerTranslates: LayerTranslates) => `
var doc = app.activeDocument;
var layers = ${JSON.stringify(layerTranslates)};
for (var i = 0; i < layers.length; i++) {
    var fromName = layers[i].from;
    var toName = layers[i].to;

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

        // Remove the 'to' layer
        to.remove();
    }
}
`;

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
