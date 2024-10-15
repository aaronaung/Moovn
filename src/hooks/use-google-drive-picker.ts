import { useState, useEffect, useCallback } from "react";
import { env } from "@/env.mjs";

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

export const useGoogleDrivePicker = (accessToken: string) => {
  const [pickerApiLoaded, setPickerApiLoaded] = useState(false);
  const [pickerData, setPickerData] = useState<any>(null);

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

  const createPicker = useCallback(() => {
    if (pickerApiLoaded && window.google && window.google.picker) {
      const picker = new window.google.picker.PickerBuilder()
        .addView(window.google.picker.ViewId.DOCS)
        .setOAuthToken(accessToken)
        .setDeveloperKey(env.NEXT_PUBLIC_GOOGLE_API_KEY)
        .setCallback(pickerCallback)
        .setAppId(env.NEXT_PUBLIC_GOOGLE_CLIENT_ID)
        .build();
      picker.setVisible(true);
    }
  }, [pickerApiLoaded, accessToken]);

  const pickerCallback = (data: any) => {
    if (data.action === window.google.picker.Action.PICKED) {
      setPickerData(data);
    }
  };

  return { createPicker, pickerData };
};
