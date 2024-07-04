"use client";
import { Header2 } from "@/src/components/common/header";
import { Spinner } from "@/src/components/common/loading-spinner";
import { ConfirmationDialog } from "@/src/components/dialogs/general-confirmation-dialog";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/src/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/src/components/ui/tooltip";
import { toast } from "@/src/components/ui/use-toast";
import { SourceDataView } from "@/src/consts/sources";
import { BUCKETS } from "@/src/consts/storage";
import { usePhotopeaEditor } from "@/src/contexts/photopea-editor";
import { FileExport, usePhotopeaHeadless } from "@/src/contexts/photopea-headless";
import { supaClientComponentClient } from "@/src/data/clients/browser";
import { getScheduleDataForSource } from "@/src/data/sources";
import { useSignedUrl } from "@/src/hooks/use-signed-url";
import { useSupaQuery } from "@/src/hooks/use-supabase";
import { exportCmd, moveLayerCmd, updateLayersCmd } from "@/src/libs/designs/photopea";
import { determinePSDActions, PSDActions, PSDActionType } from "@/src/libs/designs/photoshop-v2";
import { transformScheduleV2 } from "@/src/libs/sources/utils";
import { download } from "@/src/utils";
import { Tables } from "@/types/db";
import { PaintBrushIcon, PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
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

  const { open: openPhotopeaEditor } = usePhotopeaEditor();
  const { signedUrl, loading: isLoadingSignedUrl } = useSignedUrl({
    bucket: BUCKETS.templates,
    objectPath: `${template.owner_id}/${template.id}.psd`,
  });
  const {
    signedUrl: overwritePsdSignedUrl,
    loading: isLoadingOverwritePsdSignedUrl,
    refresh: refreshOverwritePsd,
  } = useSignedUrl({
    bucket: BUCKETS.designs,
    objectPath: `${template.owner_id}/${template.id}.psd`,
  });
  const {
    signedUrl: overwriteJpgSignedUrl,
    loading: isLoadingOverwriteJpgSignedUrl,
    refresh: refreshOverwriteJpg,
  } = useSignedUrl({
    bucket: BUCKETS.designs,
    objectPath: `${template.owner_id}/${template.id}.jpeg`,
  });

  const [isBuildingPhotopeaActions, setIsBuildingPhotopeaActions] = useState(false);
  const [layerMovements, setLayerMovements] = useState<{ from: string; to: string }[]>([]);
  const [layerEdits, setLayerEdits] = useState<PSDActions>({});
  const [designUrl, setDesignUrl] = useState<string>();
  const [psdUrl, setPsdUrl] = useState<string>();
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [isConfirmationDialogOpen, setIsConfirmationDialogOpen] = useState(false);

  useEffect(() => {
    if (isLoadingOverwriteJpgSignedUrl || isLoadingOverwritePsdSignedUrl) {
      return;
    }
    if (overwriteJpgSignedUrl && overwritePsdSignedUrl) {
      setDesignUrl(overwriteJpgSignedUrl);
      setPsdUrl(overwritePsdSignedUrl);
      return;
    }

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
  }, [
    scheduleData,
    signedUrl,
    isLoadingOverwriteJpgSignedUrl,
    isLoadingOverwritePsdSignedUrl,
    overwriteJpgSignedUrl,
    overwritePsdSignedUrl,
  ]);

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

  const uploadFileExport = async (fileExport: FileExport) => {
    if (!fileExport["psd"] || !fileExport["jpg"]) {
      console.error("missing either psd or jpg in file export:", { fileExport });
      toast({
        variant: "destructive",
        title: "Failed to save design. Please try again or contact support.",
      });
      return;
    }
    // upload overwrite content to storage.
    const psdPath = `${template.owner_id}/${template.id}.psd`;
    const jpgPath = `${template.owner_id}/${template.id}.jpeg`;

    // Unfortunately, we have to remove the existing files before uploading the new ones, because
    // createSignedUploadUrl fails if the file already exists.
    await supaClientComponentClient.storage.from(BUCKETS.designs).remove([psdPath, jpgPath]);
    const [psd, jpg] = await Promise.all([
      supaClientComponentClient.storage.from(BUCKETS.designs).createSignedUploadUrl(psdPath),
      supaClientComponentClient.storage.from(BUCKETS.designs).createSignedUploadUrl(jpgPath),
    ]);

    if (!psd.data?.token || !jpg.data?.token) {
      console.error("Failed to get signed URL: errors ->", { psd: psd.error, jpg: jpg.error });
      return;
    }
    await Promise.all([
      supaClientComponentClient.storage
        .from(BUCKETS.designs)
        .uploadToSignedUrl(psdPath, psd.data?.token, fileExport["psd"], {}),
      supaClientComponentClient.storage
        .from(BUCKETS.designs)
        .uploadToSignedUrl(jpgPath, jpg.data?.token, fileExport["jpg"]),
    ]);
    toast({
      variant: "success",
      title: "Design saved",
    });
  };

  const isDesignNotReady =
    isLoadingScheduleData ||
    isLoadingSignedUrl ||
    isBuildingPhotopeaActions ||
    isRefreshingScheduleData ||
    isLoadingOverwriteJpgSignedUrl ||
    isLoadingOverwritePsdSignedUrl ||
    (!photopeaIframeSrc && !(overwriteJpgSignedUrl && overwritePsdSignedUrl));

  const isScheduleEmpty = (scheduleData?.schedules || []).length === 0;

  const renderDesignContent = () => {
    if (isDesignNotReady) {
      return <Spinner />;
    }
    if (isScheduleEmpty) {
      return <p className="text-sm text-muted-foreground">Nothing scheduled for today!</p>;
    }

    return (
      <>
        {designUrl && <DesignImage url={designUrl} onClick={() => setIsImageViewerOpen(true)} />}
        {photopeaIframeSrc && (
          <PhotopeaRenderingContainer
            namespace={template.id}
            photopeaIframeSrc={photopeaIframeSrc}
            layerMovements={layerMovements}
            layerEdits={layerEdits}
            onFileExport={(fileExport) => {
              if (fileExport["psd"]) {
                setPsdUrl(URL.createObjectURL(new Blob([fileExport["psd"]], { type: "image/vnd.adobe.photoshop" })));
              }
              if (fileExport["jpg"]) {
                setDesignUrl(URL.createObjectURL(new Blob([fileExport["jpg"]], { type: "image/jpeg" })));
              }
            }}
          />
        )}
      </>
    );
  };

  return (
    <>
      {overwriteJpgSignedUrl && overwritePsdSignedUrl && (
        <ConfirmationDialog
          isOpen={isConfirmationDialogOpen}
          onClose={() => {
            setIsConfirmationDialogOpen(false);
          }}
          onConfirm={async () => {
            await supaClientComponentClient.storage
              .from(BUCKETS.designs)
              .remove([`${template.owner_id}/${template.id}.psd`, `${template.owner_id}/${template.id}.jpeg`]);
            refreshOverwritePsd();
            refreshOverwriteJpg();
          }}
          title={"Refresh design"}
          label={"This will remove the current design. This action cannot be undone. Are you sure you want to proceed?"}
        />
      )}
      <Card className="w-[320px]">
        <CardHeader className="py-2 pl-4 pr-2">
          <div className="flex">
            <div className="flex h-20 flex-1 flex-col gap-0.5">
              <Header2 className="line-clamp-1" title={template.name || "Untitled"}></Header2>
              <p className="text-sm text-muted-foreground">
                {template.source_data_view} ({fromAndToString()})
              </p>
              {overwriteJpgSignedUrl && overwritePsdSignedUrl && (
                <Tooltip>
                  <TooltipTrigger>
                    <div className="mt-1 w-fit rounded-md bg-orange-400 px-2 py-0.5 text-xs">Overwritten</div>
                  </TooltipTrigger>
                  <TooltipContent className="w-[300px]">
                    This design was edited and overwrites the automatically generated design.
                  </TooltipContent>
                </Tooltip>
              )}
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
          {renderDesignContent()}
          <ImageViewer
            visible={isImageViewerOpen}
            images={[{ src: designUrl || "", alt: "Design" }]}
            onClose={() => setIsImageViewerOpen(false)}
          />
        </CardContent>
        <CardFooter className="flex flex-row-reverse gap-2 p-4">
          <DropdownMenu>
            <DropdownMenuTrigger disabled={!psdUrl && !designUrl}>
              <Tooltip>
                <TooltipTrigger>
                  <Button className="group" variant="secondary" disabled={!psdUrl && !designUrl}>
                    <DownloadCloudIcon width={18} className="group-hover:text-primary" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Download</TooltipContent>
              </Tooltip>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {psdUrl && (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => {
                    download(psdUrl, `${template.name}.psd`);
                  }}
                >
                  PSD
                </DropdownMenuItem>
              )}
              {designUrl && (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => {
                    if (designUrl) {
                      download(designUrl, `${template.name}.jpeg`);
                    }
                  }}
                >
                  JPEG
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant="secondary"
                className="group"
                disabled={isDesignNotReady || (!designUrl && !isScheduleEmpty)}
                onClick={async () => {
                  if (overwriteJpgSignedUrl && overwritePsdSignedUrl) {
                    setIsConfirmationDialogOpen(true);
                  } else {
                    setDesignUrl(undefined);
                    refetch();
                  }
                }}
              >
                <RefreshCwIcon width={18} className="group-hover:text-primary" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant="secondary"
                className="group"
                disabled={isDesignNotReady || (!designUrl && !isScheduleEmpty)}
                onClick={async () => {
                  if (psdUrl) {
                    const ab = await (await fetch(psdUrl)).arrayBuffer();
                    openPhotopeaEditor({ title: template.name || "Untitled" }, ab, {
                      onSaveConfirmationTitle: "This will overwrite the current design",
                      onSave: uploadFileExport,
                    });
                  }
                }}
              >
                <PaintBrushIcon width={18} className="group-hover:text-primary" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit design</TooltipContent>
          </Tooltip>
        </CardFooter>
      </Card>
    </>
  );
};

const PhotopeaRenderingContainer = ({
  namespace,
  photopeaIframeSrc,
  layerMovements,
  layerEdits,
  onFileExport,
}: {
  namespace: string;
  photopeaIframeSrc: string;
  layerMovements: { from: string; to: string }[];
  layerEdits: PSDActions;
  onFileExport: (file: FileExport) => void;
}) => {
  const photopeaRef = useRef<HTMLIFrameElement>(null);
  const [isDone, setIsDone] = useState(false);
  const { initialize: initPhotopea, clear: clearPhotopea, sendRawPhotopeaCmd } = usePhotopeaHeadless();

  useEffect(() => {
    if (isDone) {
      return;
    }
    initPhotopea(namespace, {
      ref: photopeaRef,
      onLayerCountChange: () => {
        for (const { from, to } of layerMovements) {
          sendRawPhotopeaCmd(namespace, moveLayerCmd({ from, to }));
        }
        sendRawPhotopeaCmd(namespace, exportCmd(namespace));
      },
      onFileExport: (fileExport) => {
        if (fileExport) {
          onFileExport(fileExport);
        }
      },
      onReady: async () => {
        sendRawPhotopeaCmd(namespace, updateLayersCmd(layerEdits));
        if (layerMovements.length === 0) {
          sendRawPhotopeaCmd(namespace, exportCmd(namespace));
        }
      },
      onDone: () => {
        setIsDone(true);
      },
    });

    return () => {
      clearPhotopea(namespace);
    };
  }, [photopeaRef.current, namespace, isDone]);

  return <>{!isDone && <iframe ref={photopeaRef} className="hidden h-[300px] w-[300px]" src={photopeaIframeSrc} />}</>;
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
