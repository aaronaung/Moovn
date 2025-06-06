"use client";
import { Spinner } from "@/src/components/common/loading-spinner";
import { ConfirmationDialog } from "@/src/components/dialogs/general-confirmation-dialog";
import { Button } from "@/src/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/src/components/ui/tooltip";
import { toast } from "@/src/components/ui/use-toast";
import { usePhotopeaEditor } from "@/src/contexts/photopea-editor";
import { DesignExport } from "@/src/contexts/photopea-headless";
import { download } from "@/src/utils";
import { Tables } from "@/types/db";
import { PaintBrushIcon } from "@heroicons/react/24/outline";

import { DownloadCloudIcon, RefreshCwIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { memo, useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/src/libs/indexeddb/indexeddb";
import { InstagramTag } from "@/src/libs/designs/photopea/utils";
import { ScheduleData } from "@/src/libs/sources";
import { getDesignOverwrites } from "@/src/libs/designs/util";

import { useDesignGenQueue } from "@/src/contexts/design-gen-queue";
import { deleteObject, uploadObject } from "@/src/data/r2";
import Image from "next/image";
import _ from "lodash";
import { designOverwriteR2Path } from "@/src/libs/storage";

const ImageViewer = dynamic(() => import("react-viewer"), { ssr: false });

export const DESIGN_WIDTH = 250;

export const DesignContentItem = memo(
  function DesignContentItem({
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
    const { open: openPhotopeaEditor } = usePhotopeaEditor();
    const { addJob, isJobPending } = useDesignGenQueue();
    const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
    const [isConfirmationDialogOpen, setIsConfirmationDialogOpen] = useState(false);

    const [isLoadingOverwrites, setIsLoadingOverwrites] = useState(false);
    const [isDesignGenTimedout, setIsDesignGenTimedout] = useState(false);

    const [designOverwrite, setDesignOverwrite] = useState<{
      jpgUrl?: string;
      psdUrl?: string;
    }>();
    const idbDesign = useLiveQuery(async () => {
      const design = await db.contentItems.get(contentItemIdbKey);
      if (!design || !design.jpg || !design.psd) {
        return undefined;
      }
      return {
        jpgUrl: URL.createObjectURL(new Blob([design.jpg], { type: "image/jpeg" })),
        psdUrl: URL.createObjectURL(new Blob([design.psd], { type: "image/vnd.adobe.photoshop" })),
        instagramTags: design.metadata?.ig_tags,
      };
    });
    const designJpgUrl = designOverwrite?.jpgUrl || idbDesign?.jpgUrl;
    const designPsdUrl = designOverwrite?.psdUrl || idbDesign?.psdUrl;

    const addDesignGenJob = (forceRefresh: boolean = false) => {
      addJob({
        idbKey: contentItemIdbKey,
        contentIdbKey,
        template,
        templateItem,
        schedule,
        forceRefresh,
        onTimeout: () => {
          setIsDesignGenTimedout(true);
        },
      });
    };
    useEffect(() => {
      const fetchOverwrites = async () => {
        try {
          setIsLoadingOverwrites(true);
          const designOverwrites = await getDesignOverwrites(template.owner_id, contentItemIdbKey);

          if (designOverwrites.jpgUrl && designOverwrites.psdUrl) {
            setDesignOverwrite({
              psdUrl: designOverwrites.psdUrl,
              jpgUrl: designOverwrites.jpgUrl,
            });
          }
        } finally {
          setIsLoadingOverwrites(false);
        }
      };
      fetchOverwrites();
      addDesignGenJob();
    }, [template, schedule]);

    const uploadDesignExport = async (designExport: DesignExport) => {
      if (!designExport["psd"] || !designExport["jpg"]) {
        console.error("missing either psd or jpg in file export:", {
          designExport,
        });
        toast({
          variant: "destructive",
          title: "Failed to save design. Please try again or contact support.",
        });
        return;
      }
      // upload overwrite content to storage.
      const psdPath = designOverwriteR2Path(template.owner_id, contentItemIdbKey, "psd");
      const jpgPath = designOverwriteR2Path(template.owner_id, contentItemIdbKey, "jpg");

      await Promise.all([
        uploadObject("design-overwrites", psdPath, new Blob([designExport["psd"]])),
        uploadObject("design-overwrites", jpgPath, new Blob([designExport["jpg"]])),
      ]);
      toast({
        variant: "success",
        title: "Design saved",
      });
    };

    const isGeneratingDesign = isJobPending(contentIdbKey);
    const isDesignNotReady = isGeneratingDesign || isLoadingOverwrites;

    const renderDesignContent = () => {
      if (isDesignNotReady || !designJpgUrl) {
        return (
          <div
            className={`flex w-full items-center justify-center rounded-md`}
            style={{
              maxHeight: DESIGN_WIDTH,
            }}
          >
            <Spinner />
          </div>
        );
      }
      if (isDesignGenTimedout) {
        return (
          <div
            className={`flex w-full items-center justify-center rounded-md`}
            style={{
              maxHeight: DESIGN_WIDTH,
            }}
          >
            <p className="p-2 text-center text-xs text-muted-foreground">
              We couldn&apos;t generate the design. Please refresh or contact support.
            </p>
          </div>
        );
      }

      return (
        <DesignImageWithIGTags
          width={width}
          url={designJpgUrl}
          instagramTags={idbDesign?.instagramTags || []}
          onClick={() => !disableImageViewer && setIsImageViewerOpen(true)}
        />
      );
    };

    return (
      <>
        {designOverwrite && (
          <ConfirmationDialog
            isOpen={isConfirmationDialogOpen}
            onClose={() => {
              setIsConfirmationDialogOpen(false);
            }}
            onConfirm={async () => {
              await Promise.all([
                deleteObject("design-overwrites", `${template.owner_id}/${contentItemIdbKey}.psd`),
                deleteObject("design-overwrites", `${template.owner_id}/${contentItemIdbKey}.jpg`),
              ]);
              setDesignOverwrite(undefined);
              addDesignGenJob(true);
            }}
            title={"Refresh design"}
            label={`You edited this design, overwriting the generated version. Refreshing will create a new design and remove edits. 
          This cannot be undone. Are you sure you want to proceed?`}
          />
        )}
        <div style={{ width }}>
          <div
            className={`relative flex cursor-pointer items-center justify-center bg-secondary p-0`}
            style={{ minHeight: width }}
          >
            {designOverwrite && (
              <div className="absolute left-2 top-2 z-10">
                <Tooltip>
                  <TooltipTrigger>
                    <div className="mt-1 w-fit rounded-md bg-orange-400 px-2 text-xs">Edited</div>
                  </TooltipTrigger>
                  <TooltipContent style={{ width }}>
                    This design was edited which overwrites the automatically generated design.
                    Refresh to regenerate and clear the overwrite.
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
            {renderDesignContent()}
            {!disableImageViewer && (
              <ImageViewer
                visible={isImageViewerOpen}
                onMaskClick={() => {
                  setIsImageViewerOpen(false);
                }}
                images={[{ src: designJpgUrl || "", alt: "Design" }]}
                onClose={() => setIsImageViewerOpen(false)}
              />
            )}
          </div>
          <div className="flex flex-row-reverse justify-center gap-2 p-2">
            <DropdownMenu>
              <DropdownMenuTrigger disabled={!designPsdUrl && !designJpgUrl}>
                <Tooltip>
                  <TooltipTrigger type="button">
                    <Button
                      type="button"
                      className="group hover:bg-secondary-foreground hover:text-secondary"
                      variant="secondary"
                      disabled={!designPsdUrl && !designJpgUrl}
                    >
                      <DownloadCloudIcon width={18} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Download</TooltipContent>
                </Tooltip>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {designPsdUrl && (
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => {
                      download(designPsdUrl, `${template.name}.psd`);
                    }}
                  >
                    PSD
                  </DropdownMenuItem>
                )}
                {designJpgUrl && (
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => {
                      if (designJpgUrl) {
                        download(designJpgUrl, `${template.name}.jpg`);
                      }
                    }}
                  >
                    JPEG
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Tooltip>
              <TooltipTrigger type="button">
                <Button
                  variant="secondary"
                  className="group hover:bg-secondary-foreground hover:text-secondary "
                  disabled={isDesignNotReady}
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (designOverwrite) {
                      setIsConfirmationDialogOpen(true);
                    } else {
                      addDesignGenJob(true);
                    }
                  }}
                >
                  <RefreshCwIcon width={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger type="button">
                <Button
                  type="button"
                  variant="secondary"
                  className="group hover:bg-secondary-foreground hover:text-secondary"
                  disabled={isDesignNotReady || !designPsdUrl}
                  onClick={async () => {
                    if (designPsdUrl) {
                      const ab = await (await fetch(designPsdUrl)).arrayBuffer();
                      openPhotopeaEditor(
                        {
                          title: template.name || "Untitled",
                          source_data_view: template.source_data_view,
                          content_type: template.content_type,
                        },
                        ab,
                        {
                          onSaveConfirmationTitle: "This will overwrite the current design",
                          onSave: uploadDesignExport,
                          isMetadataEditable: false,
                        },
                      );
                    }
                  }}
                >
                  <PaintBrushIcon width={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit design</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </>
    );
  },
  (prevProps, nextProps) => {
    return _.isEqual(prevProps.schedule, nextProps.schedule);
  },
);

export const DesignImageWithIGTags = ({
  width = DESIGN_WIDTH,
  url,
  instagramTags,
  onClick,
  className,
}: {
  width?: number;
  url?: string;
  instagramTags: InstagramTag[];
  onClick?: () => void;
  className?: string;
}) => {
  if (url) {
    return (
      <div className="relative h-auto" onClick={onClick}>
        <div className={`absolute`} style={{ width }}>
          {instagramTags.map((itp, i) => (
            <span
              key={itp.username + i}
              className={`absolute`}
              style={{
                top: `${itp.y * width}px`,
                left: `${itp.x * width}px`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <Tooltip>
                <TooltipTrigger>
                  <div className="h-8 w-8"></div>
                </TooltipTrigger>
                <TooltipContent>{itp.username}</TooltipContent>
              </Tooltip>
            </span>
          ))}
        </div>
        <Image
          src={url}
          onClick={onClick}
          alt="Design"
          className={className}
          width={width}
          height={width}
          blurDataURL={url}
        />
      </div>
    );
  }
  return <DesignNotFound />;
};

const DesignNotFound = ({ label }: { label?: string }) => {
  return (
    <p className="px-4 text-center text-sm text-muted-foreground">
      {label ||
        "We couldn't generate the design. If this persists, please refresh the page or contact support."}
    </p>
  );
};
