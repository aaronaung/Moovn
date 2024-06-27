import { RefObject, useCallback, useEffect, useState } from "react";
import { useSupaQuery } from "./use-supabase";
import { getScheduleDataForSource } from "../data/sources";
import { SourceDataView } from "../consts/sources";
import { BUCKETS } from "../consts/storage";
import { signUrl } from "../libs/storage";
import { supaClientComponentClient } from "../data/clients/browser";
import { readPsd } from "ag-psd";
import { determinePSDActions } from "../libs/designs/photoshop-v2";
import { saveToOECmd, updateTextLayerCmd } from "../libs/designs/photopea";
import { PSDActionType } from "../libs/designs/photoshop-v2";
import { Tables } from "@/types/db";

export const useDesignFromTemplate = ({
  template,
  photopeaRef,
}: {
  template: Tables<"templates"> & { source: Tables<"sources"> | null };
  photopeaRef: RefObject<HTMLIFrameElement>;
}) => {
  const [designJpgUrl, setDesignJpgUrl] = useState<string>();
  const [signedTemplateUrl, setSignedTemplateUrl] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  const {
    data: scheduleData,
    isLoading: isLoadingScheduleData,
    refetch: refetchScheduleData,
    isRefetching: isRefetchingScheduleData,
  } = useSupaQuery(getScheduleDataForSource, {
    queryKey: ["getScheduleDataForSource", template.source?.id, template?.source_data_view],
    arg: {
      id: template.source?.id || "",
      view: (template?.source_data_view || SourceDataView.TODAY) as SourceDataView,
    },
    enabled: !!template.source,
  });

  const sendCmd = useCallback(
    (cmd: string) => {
      if (!photopeaRef.current) {
        return;
      }
      const ppWindow = photopeaRef.current.contentWindow;
      if (!ppWindow) {
        return;
      }
      ppWindow.postMessage(cmd, "*");
    },
    [photopeaRef],
  );

  // Effect for downloading template and mapping schedule data to template.
  useEffect(() => {
    if (template && scheduleData && photopeaRef.current) {
      const signTemplateUrl = async () => {
        try {
          setIsLoading(true);
          const signedUrl = await signUrl({
            bucket: BUCKETS.templates,
            objectPath: `${template.owner_id}/${template.id}.psd`,
            expiresIn: 24 * 3600,
            client: supaClientComponentClient,
          });
          setSignedTemplateUrl(signedUrl);

          // Determine PSD edit actions.
          console.log({ scheduleData, signedUrl, template });
          const templateFile = await (await fetch(signedUrl)).blob();
          const psd = readPsd(await templateFile.arrayBuffer());
          const psdActions = determinePSDActions(scheduleData, psd);

          // Send edit commands to Photopea.
          setTimeout(() => {
            // This timeout is necessary to ensure that the Photopea iframe is loaded with the signed template url.
            console.log("sending updateTextLayers cmd to photopea");
            for (const [layerName, { value }] of Object.entries(psdActions[PSDActionType.EditText as string])) {
              console.log("sending text edit cmd", layerName, value);
              sendCmd(updateTextLayerCmd(template.id, layerName, value));
            }
          }, 1000);

          setTimeout(() => {
            // This timeout is necessary to ensure that Photopea has processed the commands.
            console.log("sending saveToOE cmd to photopea");
            sendCmd(saveToOECmd(template.id, "jpg"));
            setIsLoading(false);
          }, 2000);
        } catch (err) {
          console.error("error signing template url", err);
        } finally {
          setIsLoading(false);
        }
      };
      signTemplateUrl();
    }
  }, [template, scheduleData, photopeaRef, sendCmd]);

  // Effect for handling Photopea events.
  useEffect(() => {
    window.addEventListener("message", function (e) {
      if (e.data instanceof ArrayBuffer) {
        console.log("received array buffer", e);
        // This is a save event after photopea has processed the commands.
        var blob = new Blob([e.data], { type: "image/jpeg" });
        var objectUrl = URL.createObjectURL(blob);
        setDesignJpgUrl(objectUrl);
      }
    });
  }, []);

  return {
    designJpgUrl,
    photopeaIframeSrc: `https://www.photopea.com#${encodeURIComponent(
      JSON.stringify({ files: [signedTemplateUrl], environment: {} }),
    )}`,
    isLoading: isLoading || isLoadingScheduleData || isRefetchingScheduleData,
    refresh: refetchScheduleData,
  };
};
