import { PSDActions, PSDActionType } from "./photoshop-v2";

export const getLayerCountCmd = (namespace: string) => `
try {
    var doc = app.activeDocument;
    if (doc) {
        var layers = doc.artLayers;
        if (layers && layers.length > 0) {
            app.echoToOE("layer_count:${namespace}:" + layers.length);
            app.echoToOE("loaded:${namespace}")
        }
    }
} catch(e) {
    
}

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
  var toLeft = to.bounds[0].value;
  var fromLeft = from.bounds[0].value;

  var toTop = to.bounds[1].value;
  var fromTop = from.bounds[1].value;

  from.move(to, ElementPlacement.PLACEBEFORE)
  from.translate(toLeft - fromLeft, toTop - fromTop)
  to.remove();
}

// active.move(target, ElementPlacement.PLACEBEFORE)
// active.translate(targetLeft - activeLeft, targetTop - activeTop)
// target.remove();  
`;
