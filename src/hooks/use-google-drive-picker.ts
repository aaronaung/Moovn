import { useState, useEffect, useCallback } from "react";
import { env } from "@/env.mjs";

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

export const useGoogleDrivePicker = (accessToken: string, embed: boolean = false) => {
  const [pickerApiLoaded, setPickerApiLoaded] = useState(false);
  const [pickerData, setPickerData] = useState<any>(null);
  const [pickerUri, setPickerUri] = useState<string | null>(null);

  useEffect(() => {
    const loadGooglePickerApi = () => {
      const script = document.createElement("script");
      script.src = "https://apis.google.com/js/api.js";
      script.onload = () => {
        window.gapi.load("picker", { callback: onPickerApiLoad });
      };
      document.body.appendChild(script);
    };

    const onPickerApiLoad = () => {
      setPickerApiLoaded(true);
    };

    loadGooglePickerApi();
  }, []);

  useEffect(() => {
    if (embed && pickerApiLoaded && accessToken) {
      console.log("creating picker", accessToken);
      createPicker();
    }
  }, [embed, pickerApiLoaded, accessToken]);

  const createPicker = useCallback(() => {
    if (pickerApiLoaded && window.google && window.google.picker) {
      const pickerBuilder = new window.google.picker.PickerBuilder()
        .addView(window.google.picker.ViewId.DOCS)
        .setOAuthToken(accessToken)
        .setDeveloperKey(env.NEXT_PUBLIC_GOOGLE_API_KEY)
        .setCallback(pickerCallback)
        .setAppId(env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

      if (embed) {
        const uri = pickerBuilder.toUri();
        console.log("picker uri", uri);
        setPickerUri(uri);
      } else {
        const picker = pickerBuilder.build();
        picker.setVisible(true);
      }
    }
  }, [pickerApiLoaded, accessToken, embed]);

  const pickerCallback = (data: any) => {
    if (data.action === window.google.picker.Action.PICKED) {
      setPickerData(data);
    }
  };

  return { createPicker, pickerData, pickerUri };
};
