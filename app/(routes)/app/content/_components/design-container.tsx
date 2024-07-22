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
import { SourceDataView } from "@/src/consts/sources";
import { BUCKETS } from "@/src/consts/storage";
import { usePhotopeaEditor } from "@/src/contexts/photopea-editor";
import { FileExport } from "@/src/contexts/photopea-headless";
import { supaClientComponentClient } from "@/src/data/clients/browser";
import { download } from "@/src/utils";
import { Tables } from "@/types/db";
import { PaintBrushIcon } from "@heroicons/react/24/outline";

import { DownloadCloudIcon, RefreshCwIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/src/libs/indexeddb/indexeddb";
import { useGenerateDesign } from "@/src/hooks/use-generate-design";

const ImageViewer = dynamic(() => import("react-viewer"), { ssr: false });

export const DesignContainer = ({
  template,
  source,
}: {
  template: Tables<"templates">;
  source: {
    id: string;
    view: SourceDataView;
  };
}) => {
  const { open: openPhotopeaEditor } = usePhotopeaEditor();
  const { generateDesign, isLoading: isGeneratingDesign, isScheduleEmpty } = useGenerateDesign();
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [isConfirmationDialogOpen, setIsConfirmationDialogOpen] = useState(false);

  const [isLoadingOverwrites, setIsLoadingOverwrites] = useState(false);
  const [designOverwrite, setDesignOverwrite] = useState<{
    jpgUrl?: string;
    psdUrl?: string;
  }>();
  const designFromIndexedDb = useLiveQuery(async () => {
    const design = await db.designs.get(template.id);
    if (!design) {
      return undefined;
    }
    return {
      jpgUrl: URL.createObjectURL(new Blob([design.jpg], { type: "image/jpeg" })),
      psdUrl: URL.createObjectURL(new Blob([design.psd], { type: "image/vnd.adobe.photoshop" })),
    };
  });
  const designJpgUrl = designOverwrite?.jpgUrl || designFromIndexedDb?.jpgUrl;
  const designPsdUrl = designOverwrite?.psdUrl || designFromIndexedDb?.psdUrl;

  useEffect(() => {
    const fetchOverwrites = async () => {
      try {
        setIsLoadingOverwrites(true);
        const result = await supaClientComponentClient.storage
          .from(BUCKETS.designOverwrites)
          .createSignedUrls(
            [`${template.owner_id}/${template.id}.psd`, `${template.owner_id}/${template.id}.jpg`],
            24 * 60 * 60,
          );
        if (!result.data) {
          console.log("failed to create signed url", result.error);
          return;
        }

        for (const overwrite of result.data) {
          if (overwrite.signedUrl) {
            if (overwrite.path === `${template.owner_id}/${template.id}.psd`) {
              setDesignOverwrite((prev) => ({
                ...prev,
                psdUrl: overwrite.signedUrl,
              }));
            } else if (overwrite.path === `${template.owner_id}/${template.id}.jpg`) {
              setDesignOverwrite((prev) => ({
                ...prev,
                jpgUrl: overwrite.signedUrl,
              }));
            }
          }
        }
      } finally {
        setIsLoadingOverwrites(false);
      }
    };
    fetchOverwrites();
    generateDesign(template, source);
  }, []);

  const uploadFileExport = async (fileExport: FileExport) => {
    if (!fileExport["psd"] || !fileExport["jpg"]) {
      console.error("missing either psd or jpg in file export:", {
        fileExport,
      });
      toast({
        variant: "destructive",
        title: "Failed to save design. Please try again or contact support.",
      });
      return;
    }
    // upload overwrite content to storage.
    const psdPath = `${template.owner_id}/${template.id}.psd`;
    const jpgPath = `${template.owner_id}/${template.id}.jpg`;

    // Unfortunately, we have to remove the existing files before uploading the new ones, because
    // createSignedUploadUrl fails if the file already exists.
    await supaClientComponentClient.storage
      .from(BUCKETS.designOverwrites)
      .remove([psdPath, jpgPath]);
    const [psd, jpg] = await Promise.all([
      supaClientComponentClient.storage
        .from(BUCKETS.designOverwrites)
        .createSignedUploadUrl(psdPath),
      supaClientComponentClient.storage
        .from(BUCKETS.designOverwrites)
        .createSignedUploadUrl(jpgPath),
    ]);

    if (!psd.data?.token || !jpg.data?.token) {
      console.error("Failed to get signed URL: errors ->", {
        psd: psd.error,
        jpg: jpg.error,
      });
      return;
    }
    await Promise.all([
      supaClientComponentClient.storage
        .from(BUCKETS.designOverwrites)
        .uploadToSignedUrl(psdPath, psd.data?.token, fileExport["psd"], {
          contentType: "image/vnd.adobe.photoshop",
        }),
      supaClientComponentClient.storage
        .from(BUCKETS.designOverwrites)
        .uploadToSignedUrl(jpgPath, jpg.data?.token, fileExport["jpg"], {
          contentType: "image/jpeg",
        }),
    ]);
    toast({
      variant: "success",
      title: "Design saved",
    });
  };

  const isDesignNotReady = isGeneratingDesign || isLoadingOverwrites;

  const renderDesignContent = () => {
    if (isScheduleEmpty && !designJpgUrl) {
      return <p className="text-sm text-muted-foreground">Nothing scheduled for today!</p>;
    }
    if (isDesignNotReady || !designJpgUrl) {
      return <Spinner />;
    }

    return <DesignImage url={designJpgUrl} onClick={() => setIsImageViewerOpen(true)} />;
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
            await supaClientComponentClient.storage
              .from(BUCKETS.designOverwrites)
              .remove([
                `${template.owner_id}/${template.id}.psd`,
                `${template.owner_id}/${template.id}.jpg`,
              ]);
            setDesignOverwrite(undefined);
            generateDesign(template, source, true);
          }}
          title={"Refresh design"}
          label={`You edited this design, overwriting the generated version. Refreshing will create a new design and remove edits. 
          This cannot be undone. Are you sure you want to proceed?`}
        />
      )}
      <div className="w-[320px] ">
        <div className="relative flex h-[300px] cursor-pointer items-center justify-center bg-secondary p-0">
          {designOverwrite && (
            <div className="absolute left-2 top-2">
              <Tooltip>
                <TooltipTrigger>
                  <div className="mt-1 w-fit rounded-md bg-orange-400 px-2 text-xs">Edited</div>
                </TooltipTrigger>
                <TooltipContent className="w-[300px]">
                  This design was edited which overwrites the automatically generated design.
                  Refresh to generate a new one.
                </TooltipContent>
              </Tooltip>
            </div>
          )}
          {renderDesignContent()}
          <ImageViewer
            visible={isImageViewerOpen}
            onMaskClick={() => setIsImageViewerOpen(false)}
            images={[{ src: designJpgUrl || "", alt: "Design" }]}
            onClose={() => setIsImageViewerOpen(false)}
          />
        </div>
        <div className="flex flex-row-reverse justify-center gap-2 p-2">
          <DropdownMenu>
            <DropdownMenuTrigger disabled={!designPsdUrl && !designJpgUrl}>
              <Tooltip>
                <TooltipTrigger>
                  <Button
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
            <TooltipTrigger>
              <Button
                variant="secondary"
                className="group hover:bg-secondary-foreground hover:text-secondary "
                disabled={isDesignNotReady || (!designJpgUrl && !isScheduleEmpty)}
                onClick={async () => {
                  if (designOverwrite) {
                    setIsConfirmationDialogOpen(true);
                  } else {
                    generateDesign(template, source, true);
                  }
                }}
              >
                <RefreshCwIcon width={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant="secondary"
                className="group hover:bg-secondary-foreground hover:text-secondary"
                disabled={isDesignNotReady || !designPsdUrl || isScheduleEmpty}
                onClick={async () => {
                  if (designPsdUrl) {
                    const ab = await (await fetch(designPsdUrl)).arrayBuffer();
                    openPhotopeaEditor(
                      {
                        title: template.name || "Untitled",
                        source_data_view: template.source_data_view,
                      },
                      ab,
                      {
                        onSaveConfirmationTitle: "This will overwrite the current design",
                        onSave: uploadFileExport,
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
