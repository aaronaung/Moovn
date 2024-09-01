export type InstagramTag = {
  username: string;
  x: number;
  y: number;
};

export const getLayerCountCmd = (namespace: string) => `
var doc = app.activeDocument;
var layers = doc.artLayers;
if (layers && layers.length > 0) {
    app.echoToOE("layer_count:${namespace}:" + layers.length);
}
`;

export const exportCmd = (namespace: string) => `
app.activeDocument.saveToOE("jpg");
app.echoToOE("export_file:${namespace}:jpg");

app.activeDocument.saveToOE("psd");
app.echoToOE("export_file:${namespace}:psd");
`;

export const addHeadlessPhotopeaToDom = (debugMode: boolean = false) => {
  const iframeSrc = `https://www.photopea.com#${JSON.stringify({
    environment: {
      intro: false,
      ...(debugMode ? {} : { vmode: 2 }),
    },
  })}`;
  const photopeaEl = document.createElement("iframe");
  photopeaEl.src = iframeSrc;
  photopeaEl.className = debugMode
    ? "w-[1000px] h-[800px] ml-[200px] z-10000 mt-[100px]"
    : "hidden";
  document.body.appendChild(photopeaEl);
  return photopeaEl;
};
