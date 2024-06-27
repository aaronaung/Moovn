export const updateTextLayerCmd = (id: string, layerName: string, newContent: string) => `
// Get the active document
var doc = app.activeDocument;

// Get the text layer by name
var textLayer = doc.artLayers.getByName("${layerName}");

// Check if the layer is a text layer
if (textLayer.kind == LayerKind.TEXT) {
    // Set the new text content
    textLayer.textItem.contents = "${newContent}";
} else {
    alert("The specified layer is not a text layer.");
}
app.echoToOE("${id}");
`;

export const saveToOECmd = (id: string, format: "jpg" | "psd") => `
app.activeDocument.saveToOE("${format}");
app.echoToOE("${id}");
`;

export type PPUpdateLayersRequest = {
  id: string;
  layers: {
    [key: string]: {
      // key must be one of the following: "editText", "replaceSmartObject", "deleteLayer"
      name: string;
      value: any;
    }[];
  };
};

export const updateLayersCmd = (req: PPUpdateLayersRequest) => `
// Get the active document
var doc = app.activeDocument;

var layers = ${JSON.stringify(req.layers)}
console.log('layers', layers)

// Edit text layers
for (var i = 0; i < layers.editText.length; i++) {
    var layer = layers.editText[i];
    var targetLayer = doc.artLayers.getByName(layer.name);

    if (targetLayer.kind == LayerKind.TEXT) {
        targetLayer.textItem.contents = layer.value;
    } else {
        console.log("The specified layer is not a text layer.");
    }
}

// Delete layers
for (var i = 0; i < layers.deleteLayer.length; i++) {
    var layer = layers.deleteLayer[i];
    var targetLayer = doc.artLayers.getByName(layer.name);
    targetLayer.remove();
}

// Replace smart objects
for (var i = 0; i < layers.replaceSmartObject.length; i++) {
    var layer = layers.replaceSmartObject[i];
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

console.log(fromName, toName)

var from = doc.artLayers.getByName(fromName);
var to = doc.artLayers.getByName(toName);

if (from && to) {
  var toLeft = to.bounds[0].value;
  var fromLeft = from.bounds[0].value;

  var toTop = to.bounds[1].value;
  var fromTop = from.bounds[1].value;

  from.move(to, ElementPlacement.PLACEBEFORE)
  from.translate(toLeft - fromLeft, toTop - fromTop)
}

// active.move(target, ElementPlacement.PLACEBEFORE)
// active.translate(targetLeft - activeLeft, targetTop - activeTop)
// target.remove();  
`;
