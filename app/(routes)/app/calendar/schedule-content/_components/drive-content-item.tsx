import React, { useState, useEffect } from "react";
import { Tables } from "@/types/db";

import { Spinner } from "@/src/components/common/loading-spinner";
import { Button } from "@/src/components/ui/button";
import { DownloadCloudIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/src/components/ui/tooltip";
import Image from "next/image";
import { cn } from "@/src/utils";
import { signUrl } from "@/src/data/r2";
import { driveSyncR2Path } from "@/src/libs/storage";
import { deconstructContentIdbKey } from "@/src/libs/content";
import { TemplateItemMetadata } from "@/src/consts/templates";
import { db } from "@/src/libs/indexeddb/indexeddb";
import { ContentItemType } from "@/src/consts/content";
import { GoogleDriveIcon } from "@/src/components/ui/icons/google";
import Link from "next/link";

export const DESIGN_WIDTH = 220;

export const DriveContentItem = React.memo(function DriveContentItem({
  contentIdbKey,
  contentItemIdbKey,
  template,
  templateItem,
  width = DESIGN_WIDTH,
}: {
  contentIdbKey: string;
  contentItemIdbKey: string;
  template: Tables<"templates">;
  templateItem: Tables<"template_items">;
  width?: number;
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { range } = deconstructContentIdbKey(contentIdbKey);
  const templateItemMetadata = templateItem.metadata as TemplateItemMetadata;

  useEffect(() => {
    const fetchSignedUrl = async () => {
      try {
        setIsLoading(true);
        const signedUrl = await signUrl(
          "drive-sync",
          driveSyncR2Path(
            template.owner_id,
            templateItemMetadata.drive_folder_id,
            range,
            templateItemMetadata.drive_file_name,
          ),
        );
        setSignedUrl(signedUrl);
        if (signedUrl) {
          await db.contentItems.put({
            key: contentItemIdbKey,
            content_idb_key: contentIdbKey,
            template_id: template.id,
            template_item_id: templateItem.id,
            type: ContentItemType.DriveFile,
            position: templateItem.position,
            metadata: {
              mime_type: templateItemMetadata.mime_type,
            },
            created_at: new Date(),
            updated_at: new Date(),
          });
        } else {
          await db.contentItems.delete(contentItemIdbKey);
        }
      } catch (error: any) {
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSignedUrl();
  }, []);

  const renderContent = () => {
    if (isLoading) {
      return <Spinner />;
    }

    if (error) {
      return <p className="text-sm text-red-500">{error}</p>;
    }

    if (!templateItemMetadata || !signedUrl) {
      return (
        <div className="flex h-full flex-col items-center justify-center px-4">
          <GoogleDriveIcon className="mb-2 h-6 w-6" />
          <p className="text-center text-sm text-muted-foreground">
            {`${templateItemMetadata.drive_folder_name}/${range}/${templateItemMetadata.drive_file_name}`}{" "}
            doesn&apos;t exist
          </p>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            If you think this is a mistake, try{" "}
            <Link href={`/app/sources`} className="underline">
              syncing your Drive integration.
            </Link>{" "}
          </p>
        </div>
      );
    }

    if (templateItemMetadata.mime_type?.startsWith("image/")) {
      return (
        <Image
          src={signedUrl!}
          alt={templateItemMetadata.drive_file_name}
          width={width}
          height={width}
          className="rounded-md object-cover"
        />
      );
    } else if (templateItemMetadata.mime_type?.startsWith("video/")) {
      return (
        <video src={signedUrl!} controls width={width} height={width} className="rounded-md">
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
              disabled={!signedUrl}
              onClick={() => window.open(signedUrl!, "_blank")}
            >
              <DownloadCloudIcon width={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Download</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
});
