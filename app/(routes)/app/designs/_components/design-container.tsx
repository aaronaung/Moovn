"use client";
import { Header2 } from "@/src/components/common/header";
import { Spinner } from "@/src/components/common/loading-spinner";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/src/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/src/components/ui/tooltip";
import { SOURCE_HAS_NO_DATA_ID, SourceDataView } from "@/src/consts/sources";
import { BUCKETS } from "@/src/consts/storage";
import { generateDesign, getDesignsForTemplate } from "@/src/data/designs";
import { useSignedUrl } from "@/src/hooks/use-signed-url";
import { useSupaMutation, useSupaQuery } from "@/src/hooks/use-supabase";
import { checkIfObjectExistsAtUrl } from "@/src/libs/storage";
import { userFriendlyDate } from "@/src/libs/time";
import { download } from "@/src/utils";
import { Tables } from "@/types/db";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";

import { useQueryClient } from "@tanstack/react-query";
import { endOfMonth, endOfWeek, format, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { DownloadCloudIcon, RefreshCwIcon, UploadCloudIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const ImageViewer = dynamic(() => import("react-viewer"), { ssr: false });

export const DesignContainer = ({
  template,
  triggerDesignOverwrite,
  onDeleteTemplate,
  onEditTemplate,
}: {
  template: Tables<"templates">;
  triggerDesignOverwrite: (designId: string, onOverwriteComplete: () => Promise<void>) => void;
  onDeleteTemplate: () => void;
  onEditTemplate: () => void;
}) => {
  const queryClient = useQueryClient();
  const [hasNoScheduleData, setHasNoScheduleData] = useState(false);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);

  const { data: designs, isLoading: isLoadingDesigns } = useSupaQuery(getDesignsForTemplate, {
    arg: template.id,
    queryKey: ["getDesignsForTemplate", template.id],
  });
  const { mutateAsync: _generateDesign, isPending: isGeneratingDesign } = useSupaMutation(generateDesign, {
    invalidate: [["getDesignsForTemplate", template.id]],
  });
  const latestDesign = designs?.[0];

  const {
    signedUrl: jpegSignedUrl,
    loading: isLoadingJpegSignedUrl,
    refresh: refreshJpegSignedUrl,
  } = useSignedUrl({
    bucket: BUCKETS.designs,
    objectPath: `${template.owner_id}/${template.id}/latest.jpeg`,
  });
  const { signedUrl: psdSignedUrl } = useSignedUrl({
    bucket: BUCKETS.designs,
    objectPath: `${template.owner_id}/${template.id}/latest.psd`,
  });

  const renderLatestDesign = () => {
    if (isLoadingDesigns || isLoadingJpegSignedUrl) {
      return <Spinner />;
    }
    if (latestDesign || hasNoScheduleData) {
      return <DesignImage url={jpegSignedUrl ?? undefined} hasNoData={hasNoScheduleData} />;
    }
    return <DesignNotFound />;
  };

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

  return (
    <Card className="w-[400px]">
      {jpegSignedUrl && (
        <ImageViewer
          visible={isImageViewerOpen}
          onClose={() => {
            setIsImageViewerOpen(false);
          }}
          onMaskClick={() => {
            setIsImageViewerOpen(false);
          }}
          images={[{ src: jpegSignedUrl }]}
        />
      )}
      <CardHeader className="py-4 pl-4 pr-2">
        <div className="flex">
          <div className="flex h-20 flex-1 flex-col gap-1">
            <Header2 className="line-clamp-1" title={template.name || "Untitled"}></Header2>
            <p className="text-sm text-muted-foreground">
              {template.source_data_view} ({fromAndToString()})
            </p>
            {latestDesign?.created_at ? (
              <p className="text-sm text-muted-foreground">
                Last refreshed: {userFriendlyDate(new Date(latestDesign.created_at))}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">No designs generated yet</p>
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
      <CardContent
        onClick={() => {
          setIsImageViewerOpen(true);
        }}
        className="flex h-[300px] cursor-pointer items-center justify-center bg-secondary p-0"
      >
        {renderLatestDesign()}
      </CardContent>
      <CardFooter className="flex flex-row-reverse gap-2 p-4">
        {latestDesign && (psdSignedUrl || jpegSignedUrl) && (
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
              {jpegSignedUrl && (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => {
                    download(jpegSignedUrl, `${template.name}.jpeg`);
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
              disabled={isGeneratingDesign}
              onClick={async () => {
                const resp = await _generateDesign({
                  templateId: template.id,
                });
                setHasNoScheduleData(resp.id === SOURCE_HAS_NO_DATA_ID);
                queryClient.invalidateQueries({
                  queryKey: ["getDesignsForTemplate", template.id],
                });
              }}
            >
              {isGeneratingDesign ? (
                <Spinner />
              ) : !latestDesign ? (
                "Generate"
              ) : (
                <RefreshCwIcon width={18} className="group-hover:text-primary" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Refresh</TooltipContent>
        </Tooltip>
      </CardFooter>
    </Card>
  );
};

const DesignImage = ({ hasNoData = false, url }: { hasNoData?: boolean; url?: string }) => {
  const [imageExists, setImageExists] = useState(true);

  useEffect(() => {
    if (url) {
      checkIfObjectExistsAtUrl(url).then((exists) => {
        setImageExists(exists);
      });
    }
  }, [url]);

  if (hasNoData) {
    return <DesignNotFound label={"There's no schedule data."} />;
  }
  if (url && imageExists) {
    return <img src={url} alt="Design" className="max-h-full max-w-full" />;
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
