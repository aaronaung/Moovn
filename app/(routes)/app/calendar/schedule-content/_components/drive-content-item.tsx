import React, { useState, useEffect } from "react";
import { Tables } from "@/types/db";
import { ScheduleData } from "@/src/libs/sources";
import { uploadDriveFileToR2 } from "@/src/data/sources";
import { Spinner } from "@/src/components/common/loading-spinner";
import { Button } from "@/src/components/ui/button";
import { DownloadCloudIcon, RefreshCwIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/src/components/ui/tooltip";
import Image from "next/image";
import { cn } from "@/src/utils";
import { DriveTemplateItemMetadata } from "@/src/consts/templates";
import { deconstructContentIdbKey } from "@/src/libs/content";

export const DESIGN_WIDTH = 220;

export const DriveContentItem = React.memo(function DriveContentItem({
  contentIdbKey,
  contentItemIdbKey,
  template,
  templateItem,
  schedule,
  width = DESIGN_WIDTH,
  disableImageViewer = false,
}: {
  contentIdbKey: string;
  contentItemIdbKey: string;
  template: Tables<"templates">;
  templateItem: Tables<"template_items">;
  schedule: ScheduleData;
  width?: number;
  disableImageViewer?: boolean;
}) {
  const [fileData, setFileData] = useState<{
    downloadLink: string | null;
    webViewLink: string | null;
    metadata: any | null;
  }>({ downloadLink: null, webViewLink: null, metadata: null });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const templateItemMetadata = templateItem.metadata as DriveTemplateItemMetadata;
  const { sourceId, range } = deconstructContentIdbKey(contentIdbKey);

  const fetchFileData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const r2Key = `${sourceId}/${templateItemMetadata.drive_folder_name}/${range}/${templateItemMetadata.drive_file_name}`;
      const { signedUrl, metadata } = await uploadDriveFileToR2(
        sourceId,
        `${templateItemMetadata.drive_folder_name}/${range}/${templateItemMetadata.drive_file_name}`,
        r2Key
      );
      setFileData({
        downloadLink: signedUrl,
        webViewLink: metadata?.webViewLink || null,
        metadata,
      });
    } catch (err) {
      setError("Failed to fetch file data");
      console.error(err);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchFileData();
  }, [contentItemIdbKey]);

  const renderContent = () => {
    if (isLoading) {
      return <Spinner />;
    }

    if (error) {
      return <p className="text-sm text-red-500">{error}</p>;
    }

    if (!fileData.metadata) {
      return <p className="text-sm text-muted-foreground">No content available</p>;
    }

    return (
      <div
        style={{
          width: width,
          height: width,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <iframe
          src={`https://drive.google.com/file/d/${fileData.metadata.id}/preview`}
          width="100%"
          height="100%"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            pointerEvents: "none",
          }}
        />
      </div>
    );

    if (fileData.metadata.mimeType.startsWith("image/")) {
      return (
        <Image
          src={fileData.webViewLink + ""}
          alt={fileData.metadata.name}
          width={width}
          height={width}
          className="rounded-md object-cover"
        />
      );
    } else if (fileData.metadata.mimeType.startsWith("video/")) {
      return (
        <video
          src={fileData.downloadLink!}
          controls
          width={width}
          height={width}
          className="rounded-md"
        >
          Your browser does not support the video tag.
        </video>
      );
    }

    return <p className="text-sm text-muted-foreground">Unsupported file type</p>;
  };

  return (
    <div style={{ width }}>
      <div
        className={cn("relative flex cursor-pointer items-center justify-center bg-secondary p-0")}
        style={{ minHeight: width }}
      >
        {renderContent()}
      </div>
      <div className="flex flex-row-reverse justify-center gap-2 p-2">
        <Tooltip>
          <TooltipTrigger type="button">
            <Button
              type="button"
              className="group hover:bg-secondary-foreground hover:text-secondary"
              variant="secondary"
              disabled={!fileData.downloadLink}
              onClick={() => window.open(fileData.downloadLink!, "_blank")}
            >
              <DownloadCloudIcon width={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Download</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger type="button">
            <Button
              variant="secondary"
              className="group hover:bg-secondary-foreground hover:text-secondary"
              onClick={fetchFileData}
            >
              <RefreshCwIcon width={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Refresh</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
});
