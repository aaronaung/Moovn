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
import { FileExport } from "@/src/contexts/photopea-headless";
import { supaClientComponentClient } from "@/src/data/clients/browser";
import { download } from "@/src/utils";
import { Tables } from "@/types/db";
import { PaintBrushIcon, PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";

import { endOfMonth, endOfWeek, format, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { DownloadCloudIcon, RefreshCwIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/src/libs/indexeddb/indexeddb";
import { useGenerateDesign } from "@/src/hooks/use-generate-design";

const ImageViewer = dynamic(() => import("react-viewer"), { ssr: false });

export const DesignContainer = ({
  template,
  onDeleteTemplate,
  onEditTemplate,
}: {
  template: Tables<"templates"> & { source: Tables<"sources"> | null };
  onDeleteTemplate: () => void;
  onEditTemplate: () => void;
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
          .from(BUCKETS.designs)
          .createSignedUrls(
            [`${template.owner_id}/${template.id}.psd`, `${template.owner_id}/${template.id}.jpeg`],
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
            } else if (overwrite.path === `${template.owner_id}/${template.id}.jpeg`) {
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
    generateDesign(template);
  }, []);

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
    const jpgPath = `${template.owner_id}/${template.id}.jpeg`;

    // Unfortunately, we have to remove the existing files before uploading the new ones, because
    // createSignedUploadUrl fails if the file already exists.
    await supaClientComponentClient.storage.from(BUCKETS.designs).remove([psdPath, jpgPath]);
    const [psd, jpg] = await Promise.all([
      supaClientComponentClient.storage.from(BUCKETS.designs).createSignedUploadUrl(psdPath),
      supaClientComponentClient.storage.from(BUCKETS.designs).createSignedUploadUrl(jpgPath),
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
        .from(BUCKETS.designs)
        .uploadToSignedUrl(psdPath, psd.data?.token, fileExport["psd"], {
          contentType: "image/vnd.adobe.photoshop",
        }),
      supaClientComponentClient.storage
        .from(BUCKETS.designs)
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
    if (isScheduleEmpty) {
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
              .from(BUCKETS.designs)
              .remove([
                `${template.owner_id}/${template.id}.psd`,
                `${template.owner_id}/${template.id}.jpeg`,
              ]);
            setDesignOverwrite(undefined);
            generateDesign(template, true);
          }}
          title={"Refresh design"}
          label={`You edited this design, overwriting the generated version. Refreshing will create a new design and remove edits. 
          This cannot be undone. Are you sure you want to proceed?`}
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
              {designOverwrite && (
                <Tooltip>
                  <TooltipTrigger>
                    <div className="mt-1 w-fit rounded-md bg-orange-400 px-2 py-0.5 text-xs">
                      Overwritten
                    </div>
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
            onMaskClick={() => setIsImageViewerOpen(false)}
            images={[{ src: designJpgUrl || "", alt: "Design" }]}
            onClose={() => setIsImageViewerOpen(false)}
          />
        </CardContent>
        <CardFooter className="flex flex-row-reverse gap-2 p-4">
          <DropdownMenu>
            <DropdownMenuTrigger disabled={!designPsdUrl && !designJpgUrl}>
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    className="group"
                    variant="secondary"
                    disabled={!designPsdUrl && !designJpgUrl}
                  >
                    <DownloadCloudIcon width={18} className="group-hover:text-primary" />
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
                      download(designJpgUrl, `${template.name}.jpeg`);
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
                disabled={isDesignNotReady || (!designJpgUrl && !isScheduleEmpty)}
                onClick={async () => {
                  if (designOverwrite) {
                    setIsConfirmationDialogOpen(true);
                  } else {
                    generateDesign(template, true);
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
                disabled={isDesignNotReady || (!designJpgUrl && !isScheduleEmpty)}
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
                      },
                    );
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
