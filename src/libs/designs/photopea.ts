import { PSDActions, PSDActionType } from "./photoshop-v2";

export const getLayerCountCmd = (namespace: string) => `
var doc = app.activeDocument;
var layers = doc.artLayers;
if (layers && layers.length > 0) {
    app.echoToOE("layer_count:${namespace}:" + layers.length);
}
`;

export const checkDesignCompleteCmd = (namespace: string, actions: PSDActions) => `
var doc = app.activeDocument;
var layers = ${JSON.stringify(actions)};

function checkDesignComplete() {
    for (var i = 0; i < layers.${PSDActionType.EditText}.length; i++) {
        var layer = layers.${PSDActionType.EditText}[i];
        var targetLayer = doc.artLayers.getByName(layer.name);

        if (targetLayer.kind == LayerKind.TEXT) {
            if (targetLayer.textItem.contents != layer.value) {
                app.echoToOE("check_design_complete:${namespace}:false");
                return;
            }
        }
    }

    // Ensure delete layers
    for (var i = 0; i < layers.${PSDActionType.DeleteLayer}.length; i++) {
        var layer = layers.${PSDActionType.DeleteLayer}[i];
        var targetLayer = doc.artLayers.getByName(layer.name);
        if (targetLayer) {
            app.echoToOE("check_design_complete:${namespace}:false");
            return;
        }   
    }

    // Ensure load smart objects
    for (var i = 0; i < layers.${PSDActionType.LoadSmartObjectFromUrl}.length; i++) {
        var layer = layers.${PSDActionType.LoadSmartObjectFromUrl}[i];
        var targetLayer = doc.artLayers.getByName(layer.newLayerName);
        if (!targetLayer) {
            app.echoToOE("check_design_complete:${namespace}:false");
            return;
        }
    }
    app.echoToOE("check_design_complete:${namespace}:true");
}

checkDesignComplete();
`;

export const updateLayersCmd = (updateActions: PSDActions) => `
// Get the active document
var doc = app.activeDocument;

var layers = ${JSON.stringify(updateActions)}

// Edit text layers
for (var i = 0; i < layers.${PSDActionType.EditText}.length; i++) {
    var layer = layers.${PSDActionType.EditText}[i];
    var targetLayer = doc.artLayers.getByName(layer.name);

    if (targetLayer.kind == LayerKind.TEXT) {
        targetLayer.textItem.contents = layer.value;
    } else {
        console.log("The specified layer is not a text layer.");
    }
}

// Delete layers
for (var i = 0; i < layers.${PSDActionType.DeleteLayer}.length; i++) {
    var layer = layers.${PSDActionType.DeleteLayer}[i];
    var targetLayer = doc.artLayers.getByName(layer.name);
    targetLayer.remove();
}

// Replace smart objects
for (var i = 0; i < layers.${PSDActionType.LoadSmartObjectFromUrl}.length; i++) {
    var layer = layers.${PSDActionType.LoadSmartObjectFromUrl}[i];
    if (layer.value == ""){
        continue;
    }
    app.open(layer.value,null,true)
}
`;

export const moveLayerCmd = ({ from, to }: { from: string; to: string }) => `
var doc = app.activeDocument;
var fromName = '${from}';
var toName = '${to}';

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
`;

export const exportCmd = (namespace: string) => `
app.activeDocument.saveToOE("jpg");
app.echoToOE("export_file:${namespace}:jpg");

app.activeDocument.saveToOE("psd");
app.echoToOE("export_file:${namespace}:psd");
`;
