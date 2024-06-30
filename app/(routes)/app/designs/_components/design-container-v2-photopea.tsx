"use client";
import { Header2 } from "@/src/components/common/header";
import { Spinner } from "@/src/components/common/loading-spinner";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/src/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/src/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/src/components/ui/tooltip";
import { SourceDataView } from "@/src/consts/sources";
import { BUCKETS } from "@/src/consts/storage";
import { usePhotopea } from "@/src/contexts/photopea";
import { getScheduleDataForSource } from "@/src/data/sources";
import { useSignedUrl } from "@/src/hooks/use-signed-url";
import { useSupaQuery } from "@/src/hooks/use-supabase";
import { moveLayerCmd, updateLayersCmd } from "@/src/libs/designs/photopea";
import { determinePSDActions, PSDActions, PSDActionType } from "@/src/libs/designs/photoshop-v2";
import { transformScheduleV2 } from "@/src/libs/sources/utils";
import { Tables } from "@/types/db";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import { readPsd } from "ag-psd";

import { endOfMonth, endOfWeek, format, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { DownloadCloudIcon, RefreshCwIcon } from "lucide-react";
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
  const [photopeaIframeSrc, setPhotopeaIframeSrc] = useState<string | null>(null);

  const {
    data: scheduleData,
    isLoading: isLoadingScheduleData,
    refetch,
    isRefetching: isRefreshingScheduleData,
  } = useSupaQuery(getScheduleDataForSource, {
    arg: {
      id: template.source?.id || "",
      view: template.source_data_view as SourceDataView,
    },
    queryKey: ["getScheduleDataForSource", template.id],
    enabled: !!template.source,
    refetchOnWindowFocus: false,
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
          const psdActions = determinePSDActions(transformScheduleV2(scheduleData), psd);

          setLayerEdits(psdActions);
          // We only want to move the layers after the smart objects have been loaded via the updateLayersCmd.
          // LayerMovements are usually processed upon layer count change.
          setLayerMovements(
            psdActions[PSDActionType.LoadSmartObjectFromUrl as string].map(({ name, newLayerName }) => ({
              from: newLayerName || name,
              to: name,
            })),
          );
          setPhotopeaIframeSrc(`https://www.photopea.com#${JSON.stringify({ files: [signedUrl], environment: {} })}`);
        } catch (err) {
          console.error("failed to determine PSD actions", err);
        } finally {
          setIsBuildingPhotopeaActions(false);
        }
        // Use the schedule data to determine the actions to take on the template PSD.
      };
      buildPhotopeaActions();
    }
  }, [scheduleData, signedUrl]);

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

  const isLoading =
    isLoadingScheduleData ||
    isLoadingSignedUrl ||
    isBuildingPhotopeaActions ||
    isRefreshingScheduleData ||
    !photopeaIframeSrc;

  return (
    <>
      <Card className="w-[400px]">
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
        <CardContent className="flex h-[300px] cursor-pointer items-center justify-center bg-secondary p-0">
          {isLoading ? (
            <Spinner />
          ) : (
            <PhotopeaContainer
              namespace={template.id}
              photopeaIframeSrc={photopeaIframeSrc}
              layerMovements={layerMovements}
              layerEdits={layerEdits}
            />
          )}
        </CardContent>
        <CardFooter className="flex flex-row-reverse gap-2 p-4">
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
              {/* {psdSignedUrl && (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => {
                    download(psdSignedUrl, `${template.name}.psd`);
                  }}
                >
                  PSD
                </DropdownMenuItem>
              )} */}
              {/* <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => {
                  if (designUrl) {
                    download(designUrl, `${template.name}.jpeg`);
                  }
                }}
              >
                JPEG
              </DropdownMenuItem> */}
            </DropdownMenuContent>
          </DropdownMenu>
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant="secondary"
                className="group"
                disabled={isLoading}
                onClick={async () => {
                  refetch();
                }}
              >
                <RefreshCwIcon width={18} className="group-hover:text-primary" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh</TooltipContent>
          </Tooltip>
        </CardFooter>
      </Card>
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
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const photopeaRef = useRef<HTMLIFrameElement>(null);
  const [isDone, setIsDone] = useState(false);
  const { initialize: initPhotopea, clear: clearPhotopea, sendRawPhotopeaCmd, sendExportFileCmd } = usePhotopea();
  const [designUrl, setDesignUrl] = useState<string | null>(null);

  useEffect(() => {
    initPhotopea(namespace, {
      ref: photopeaRef,
      onLayerCountChange: () => {
        for (const { from, to } of layerMovements) {
          sendRawPhotopeaCmd(namespace, moveLayerCmd({ from, to }));
        }
        sendExportFileCmd(namespace, "jpg");
      },
      onFileExport: (fileExport) => {
        if (fileExport) {
          setDesignUrl(URL.createObjectURL(new Blob([fileExport.data])));
        }
      },
      onReady: async () => {
        sendRawPhotopeaCmd(namespace, updateLayersCmd(layerEdits));
      },
      onDone: () => {
        setIsDone(true);
      },
    });

    return () => {
      clearPhotopea(namespace);
    };
  }, [photopeaRef.current, namespace]);

  return (
    <>
      {!isDone && <iframe ref={photopeaRef} className="hidden h-[300px] w-[300px]" src={photopeaIframeSrc} />}
      {designUrl ? (
        <>
          <DesignImage
            url={designUrl}
            onClick={() => {
              setIsImageViewerOpen(true);
            }}
          />
          <ImageViewer
            visible={isImageViewerOpen}
            onClose={() => {
              setIsImageViewerOpen(false);
            }}
            onMaskClick={() => {
              setIsImageViewerOpen(false);
            }}
            images={[{ src: designUrl }]}
          />
        </>
      ) : (
        <Spinner />
      )}
    </>
  );
};

const DesignImage = ({ url, onClick }: { url?: string; onClick: () => void }) => {
  if (url) {
    return <img src={url} onClick={onClick} alt="Design" className="h-[300px] w-[300px]" />;
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
