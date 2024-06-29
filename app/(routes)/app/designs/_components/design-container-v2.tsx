"use client";
import { Spinner } from "@/src/components/common/loading-spinner";
import { SourceDataView } from "@/src/consts/sources";
import { BUCKETS } from "@/src/consts/storage";
import { usePhotopea } from "@/src/contexts/photopea";
import { getScheduleDataForSource } from "@/src/data/sources";
import { useSignedUrl } from "@/src/hooks/use-signed-url";
import { useSupaQuery } from "@/src/hooks/use-supabase";
import { moveLayerCmd, updateLayersCmd } from "@/src/libs/designs/photopea";
import { determinePSDActions, PSDActions, PSDActionType } from "@/src/libs/designs/photoshop-v2";
import { Tables } from "@/types/db";
import { readPsd } from "ag-psd";

import { endOfMonth, endOfWeek, format, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const ImageViewer = dynamic(() => import("react-viewer"), { ssr: false });

export const DesignContainerV2 = ({
  template,
  onDeleteTemplate,
  onEditTemplate,
}: {
  template: Tables<"templates"> & { source: Tables<"sources"> | null };
  onDeleteTemplate: () => void;
  onEditTemplate: () => void;
}) => {
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);

  const [photopeaIframeSrc, setPhotopeaIframeSrc] = useState<string | null>(null);

  const { data: scheduleData, isLoading: isLoadingScheduleData } = useSupaQuery(getScheduleDataForSource, {
    arg: {
      id: template.source?.id || "",
      view: template.source_data_view as SourceDataView,
    },
    queryKey: ["getScheduleDataForSource", template.source?.id, template.source_data_view],
    enabled: !!template.source,
  });
  const { signedUrl, loading: isLoadingSignedUrl } = useSignedUrl({
    bucket: BUCKETS.templates,
    objectPath: `${template.owner_id}/${template.id}.psd`,
  });

  const [isBuildingPhotopeaActions, setIsBuildingPhotopeaActions] = useState(false);
  const [layerMovements, setLayerMovements] = useState<{ from: string; to: string }[]>([]);
  const [layerEdits, setLayerEdits] = useState<PSDActions>({});

  useEffect(() => {
    if (scheduleData && signedUrl) {
      const buildPhotopeaActions = async () => {
        try {
          setIsBuildingPhotopeaActions(true);
          const templateFile = await (await fetch(signedUrl)).blob();
          const psd = readPsd(await templateFile.arrayBuffer());
          const psdActions = determinePSDActions(scheduleData, psd);

          setLayerEdits(psdActions);
          // We only want to move the layers after the smart objects have been loaded via the updateLayersCmd.
          // LayerMovements are usually processed upon layer count change.
          setLayerMovements(
            psdActions[PSDActionType.LoadSmartObjectFromUrl as string].map(({ name, newLayerName }) => ({
              from: newLayerName || name,
              to: name,
            })),
          );
        } catch (err) {
          console.error("failed to determine PSD actions", err);
        } finally {
          setIsBuildingPhotopeaActions(false);
        }
        // Use the schedule data to determine the actions to take on the template PSD.
      };
      buildPhotopeaActions();
      setPhotopeaIframeSrc(`https://www.photopea.com#${JSON.stringify({ files: [signedUrl], environment: {} })}`);
    }
  }, [scheduleData, signedUrl]);

  // const renderLatestDesign = () => {
  //   if (isLoading || !designJpgUrl) {
  //     return <Spinner />;
  //   }
  //   return <DesignImage url={designJpgUrl} />;
  // };

  const fromAndToString = () => {
    const currDateTime = new Date();

    // Default to daily view
    let fromAndTo: { from: Date; to?: Date } = {
      from: startOfDay(currDateTime),
    };
    switch (template.source_data_view) {
      case SourceDataView.THIS_WEEK:
        fromAndTo = {
          from: startOfWeek(currDateTime),
          to: endOfWeek(currDateTime),
        };
        break;
      case SourceDataView.THIS_MONTH:
        fromAndTo = {
          from: startOfMonth(currDateTime),
          to: endOfMonth(currDateTime),
        };
        break;
      default:
    }

    if (!fromAndTo.to) {
      return format(fromAndTo.from, "MMM d");
    }
    return `${format(fromAndTo.from, "MMM d")} - 
    ${format(fromAndTo.to, "MMM d")}`;
  };

  if (isLoadingScheduleData || isLoadingSignedUrl || isBuildingPhotopeaActions) {
    return <Spinner />;
  }

  return (
    <>
      {photopeaIframeSrc && (
        <PhotopeaContainer
          namespace={template.id}
          photopeaIframeSrc={photopeaIframeSrc}
          layerMovements={layerMovements}
          layerEdits={layerEdits}
        />
      )}
      {/* <Card className="w-[400px]">
        {designJpgUrl && (
          <ImageViewer
            visible={isImageViewerOpen}
            onClose={() => {
              setIsImageViewerOpen(false);
            }}
            onMaskClick={() => {
              setIsImageViewerOpen(false);
            }}
            images={[{ src: designJpgUrl }]}
          />
        )}
        <CardHeader className="py-4 pl-4 pr-2">
          <div className="flex">
            <div className="flex h-20 flex-1 flex-col gap-1">
              <Header2 className="line-clamp-1" title={template.name || "Untitled"}></Header2>
              <p className="text-sm text-muted-foreground">
                {template.source_data_view} ({fromAndToString()})
              </p>
            </div>
            <div className="flex gap-x-0.5">
              <PencilSquareIcon
                onClick={() => {
                  onEditTemplate();
                }}
                className="h-9 w-9 cursor-pointer rounded-full p-2 text-secondary-foreground hover:bg-secondary"
              />
              <TrashIcon
                onClick={() => {
                  onDeleteTemplate();
                }}
                className="h-9 w-9 cursor-pointer rounded-full p-2 text-destructive hover:bg-secondary"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent
          onClick={() => {
            setIsImageViewerOpen(true);
          }}
          className="flex h-[300px] cursor-pointer items-center justify-center bg-secondary p-0"
        >
          {renderLatestDesign()}
        </CardContent>
        <CardFooter className="flex flex-row-reverse gap-2 p-4">
          {designJpgUrl && (
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Tooltip>
                  <TooltipTrigger>
                    <Button className="group" variant="secondary">
                      <DownloadCloudIcon width={18} className="group-hover:text-primary" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Download</TooltipContent>
                </Tooltip>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {psdSignedUrl && (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => {
                    download(psdSignedUrl, `${template.name}.psd`);
                  }}
                >
                  PSD
                </DropdownMenuItem>
              )}
                {designJpgUrl && (
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => {
                      download(designJpgUrl, `${template.name}.jpeg`);
                    }}
                  >
                    JPEG
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {latestDesign && (
          <Tooltip>
            <TooltipTrigger>
              <Button
                className="group"
                variant="secondary"
                onClick={() => {
                  triggerDesignOverwrite(latestDesign.id, async () => {
                    refreshJpegSignedUrl();
                  });
                }}
              >
                <UploadCloudIcon width={18} className="group-hover:text-primary" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Overwrite</TooltipContent>
          </Tooltip>
        )}
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant="secondary"
                className="group"
                disabled={isLoading}
                onClick={async () => {
                  refreshDesign();
                }}
              >
                {isLoading ? <Spinner /> : <RefreshCwIcon width={18} className="group-hover:text-primary" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh</TooltipContent>
          </Tooltip>
        </CardFooter>
      </Card> */}
    </>
  );
};

const PhotopeaContainer = ({
  namespace,
  photopeaIframeSrc,
  layerMovements,
  layerEdits,
}: {
  namespace: string;
  photopeaIframeSrc: string;
  layerMovements: { from: string; to: string }[];
  layerEdits: PSDActions;
}) => {
  const photopeaRef = useRef<HTMLIFrameElement>(null);
  const [layerCount, setLayerCount] = useState(0);
  const {
    initialize: initPhotopea,
    clear: clearPhotopea,
    sendRawPhotopeaCmd,
    sendExportFileCmd,
    exportQueue,
    exportMetadataQueue,
  } = usePhotopea();
  const [designUrl, setDesignUrl] = useState<string | null>(null);

  useEffect(() => {
    let lastExportIndex = 0;
    let lastExportMetadata;
    for (let i = 0; i < exportMetadataQueue.length; i++) {
      if (exportMetadataQueue[i].namespace === namespace) {
        lastExportIndex = i;
        lastExportMetadata = exportMetadataQueue[i];
      }
    }
    if (lastExportMetadata && lastExportMetadata.format === "jpg" && exportQueue[lastExportIndex]) {
      setDesignUrl(URL.createObjectURL(new Blob([exportQueue[lastExportIndex]])));
    }
  }, [exportMetadataQueue, exportQueue]);

  useEffect(() => {
    initPhotopea(namespace, {
      ref: photopeaRef,
      onLayerCountChange: (count) => {
        if (count !== layerCount) {
          setLayerCount(count);
          for (const { from, to } of layerMovements) {
            sendRawPhotopeaCmd(namespace, moveLayerCmd({ from, to }));
          }
          sendExportFileCmd(namespace, "jpg");
        }
      },
      onReady: async () => {
        console.log("PHOTOPEA READY! ~~~", namespace);
        sendRawPhotopeaCmd(namespace, updateLayersCmd(layerEdits));
      },
    });

    return () => {
      clearPhotopea(namespace);
    };
  }, [photopeaRef.current]);

  return (
    <div>
      {namespace}

      {designUrl ? <DesignImage url={designUrl} /> : <DesignNotFound label="Building design..." />}
      <iframe ref={photopeaRef} className="hidden h-[500px] w-[500px]" src={photopeaIframeSrc} />
    </div>
  );
};

const DesignImage = ({ url }: { url?: string }) => {
  if (url) {
    return <img src={url} alt="Design" className="h-[500px] w-[500px]" />;
  }
  return <DesignNotFound />;
};

const DesignNotFound = ({ label }: { label?: string }) => {
  return (
    <p className="px-4 text-center text-sm text-muted-foreground">
      {label ||
        "We couldn't generate the design. Please check for schedule data for this template. If this seems wrong, refresh or contact support."}
    </p>
  );
};
