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
import { SourceDataView } from "@/src/consts/sources";
import { useDesignFromTemplate } from "@/src/hooks/use-design-from-template";
import { download } from "@/src/utils";
import { Tables } from "@/types/db";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";

import { useQueryClient } from "@tanstack/react-query";
import { endOfMonth, endOfWeek, format, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { DownloadCloudIcon, RefreshCwIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { useRef, useState } from "react";

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
  const queryClient = useQueryClient();
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const photopeaRef = useRef<HTMLIFrameElement>(null);

  const {
    designJpgUrl,
    photopeaIframeSrc,
    isLoading,
    refresh: refreshDesign,
  } = useDesignFromTemplate({
    template,
    photopeaRef,
  });

  const renderLatestDesign = () => {
    if (isLoading || !designJpgUrl) {
      return <Spinner />;
    }
    return <DesignImage url={designJpgUrl} />;
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
    <>
      <iframe ref={photopeaRef} className=" h-screen w-full" src={photopeaIframeSrc} />
      <Card className="w-[400px]">
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
          {/* {latestDesign && (
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
        )} */}
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
      </Card>
    </>
  );
};

const DesignImage = ({ url }: { url?: string }) => {
  if (url) {
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
