import { useState } from "react";

export const usePhotopea = () => {
  const [ppEventStream, setPpEventStream] = useState<any[]>([]);

  useEffect(() => {
    window.addEventListener("message", processEventFromPhotopea);
    return () => {
      window.removeEventListener("message", processEventFromPhotopea);
    };
  }, []);

  const processEventFromPhotopea = (e: MessageEvent) => {
    if (e.data instanceof ArrayBuffer) {
      // This is a save event.
      var blob = new Blob([e.data], { type: "image/jpeg" });
      var objectUrl = URL.createObjectURL(blob);
      setResultJpg(objectUrl);
    }
    setPpEventStream((prev) => [...prev, e.data]);
  };

  const exportFileCmd = (format: "jpg" | "psd") => `
    app.activeDocument.saveToOE("${format}");
  `;

  const openImage = (url: string) => `
    app.open("${url}", null, true);
    app.echoToOE("opened", app.activeDocument.activeLayer.name)
  `;

  const pollForLayerCount = () => `
    app.echoToOE(app.activeDocument.artLayers.length);
  `;

  return {
    processEventFromPhotopea,
    exportFileCmd,
  };
};
