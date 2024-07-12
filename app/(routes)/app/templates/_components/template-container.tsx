"use client";
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
import { toast } from "@/src/components/ui/use-toast";
import { BUCKETS } from "@/src/consts/storage";
import { PhotopeaEditorMetadata, usePhotopeaEditor } from "@/src/contexts/photopea-editor";
import { FileExport } from "@/src/contexts/photopea-headless";
import { supaClientComponentClient } from "@/src/data/clients/browser";
import { download } from "@/src/utils";
import { Tables } from "@/types/db";
import { PaintBrushIcon, TrashIcon } from "@heroicons/react/24/outline";

import { DownloadCloudIcon, RefreshCwIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { signUrl, upsertObjectAtPath } from "@/src/libs/storage";
import { useGenerateTemplateJpg } from "@/src/hooks/use-generate-template-jpg";
import { db } from "@/src/libs/indexeddb/indexeddb";
import { endOfMonth, endOfWeek, format, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { SourceDataView } from "@/src/consts/sources";

const ImageViewer = dynamic(() => import("react-viewer"), { ssr: false });

export const TemplateContainer = ({
  template,
  onDeleteTemplate,
}: {
  template: Tables<"templates">;
  onDeleteTemplate: () => void;
}) => {
  const { open: openPhotopeaEditor } = usePhotopeaEditor();
  const {
    generateTemplateJpg,
    templateJpg: generatedTemplateJpg,
    isLoading: isGeneratingTemplateJpg,
  } = useGenerateTemplateJpg();
  const [isLoadingTemplateSignedUrl, setIsLoadingTemplateSignedUrl] = useState(false);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);

  const [templateData, setTemplateData] = useState<{
    psd?: ArrayBuffer;
    jpg?: ArrayBuffer;
  }>();

  const jpgBlobUrl = templateData?.jpg
    ? URL.createObjectURL(new Blob([templateData.jpg]))
    : undefined;
  const psdBlobUrl = templateData?.psd
    ? URL.createObjectURL(new Blob([templateData.psd]))
    : undefined;

  useEffect(() => {
    if (generatedTemplateJpg) {
      setTemplateData((prev) => ({
        ...prev,
        jpg: generatedTemplateJpg,
      }));
      db.templates.update(template.id, { jpg: generatedTemplateJpg, lastUpdated: new Date() });
    }
  }, [generatedTemplateJpg]);

  useEffect(() => {
    const fetchTemplateSignedUrl = async () => {
      try {
        setIsLoadingTemplateSignedUrl(true);

        const templateFromIndexedDb = await db.templates.get(template.id);
        if (templateFromIndexedDb?.jpg && templateFromIndexedDb?.psd) {
          setTemplateData({
            jpg: templateFromIndexedDb.jpg,
            psd: templateFromIndexedDb.psd,
          });
        } else {
          const psdSignedUrl = await signUrl({
            bucket: BUCKETS.templates,
            objectPath: `${template.owner_id}/${template.id}.psd`,
            client: supaClientComponentClient,
          });

          const psd = await (await fetch(psdSignedUrl)).arrayBuffer();
          generateTemplateJpg(template, psd);
          setTemplateData((prev) => ({
            ...prev,
            psd,
          }));
          db.templates.put({ templateId: template.id, psd, lastUpdated: new Date() });
        }
      } catch (err) {
        console.error("Failed to get signed URL for template:", err);
        toast({
          variant: "destructive",
          title: "Failed to load template. Please try again or contact support.",
        });
      } finally {
        setIsLoadingTemplateSignedUrl(false);
      }
    };

    fetchTemplateSignedUrl();
  }, []);

  const handleTemplateSave = async (
    fileExport: FileExport,
    metadataChanges: Partial<PhotopeaEditorMetadata>,
  ) => {
    if (!fileExport["psd"] || !fileExport["jpg"]) {
      console.error("missing psd or jpg file in export:", {
        fileExport,
      });
      toast({
        variant: "destructive",
        title: "Failed to save template. Please try again or contact support.",
      });
      return;
    }

    await Promise.all([
      upsertObjectAtPath({
        bucket: BUCKETS.templates,
        objectPath: `${template.owner_id}/${template.id}.psd`,
        client: supaClientComponentClient,
        content: fileExport["psd"],
        contentType: "image/vnd.adobe.photoshop",
      }),
      db.designs.delete(template.id), // Bust design cache since the template has changed, so we can regenerate the design.
      db.templates.put({
        templateId: template.id,
        jpg: fileExport["jpg"],
        psd: fileExport["psd"],
        lastUpdated: new Date(),
      }),
    ]);

    if (metadataChanges.title !== template.name) {
      await supaClientComponentClient
        .from("templates")
        .update({
          name: metadataChanges.title,
        })
        .eq("id", template.id);
    }
    toast({
      variant: "success",
      title: "Template saved",
    });
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

  const renderTemplateContent = () => {
    if (isLoadingTemplateSignedUrl || isGeneratingTemplateJpg || !jpgBlobUrl) {
      return <Spinner />;
    }
    return (
      <img
        src={jpgBlobUrl}
        onClick={() => setIsImageViewerOpen(true)}
        alt="Template"
        className="h-[300px] w-[300px]"
      />
    );
  };

  return (
    <Card className="w-[320px]">
      <CardHeader className="py-4 pl-4 pr-2">
        <div className="flex ">
          <div className="flex-1">
            <p className="mb-1 line-clamp-2 flex-1 text-sm font-medium">
              {template.name || "Untitled"}
            </p>
            <p className="text-xs text-muted-foreground">
              Schedule range: {template.source_data_view} ({fromAndToString()})
            </p>
          </div>

          <div className="flex gap-x-0.5">
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
        {renderTemplateContent()}
        {jpgBlobUrl && (
          <ImageViewer
            visible={isImageViewerOpen}
            onMaskClick={() => setIsImageViewerOpen(false)}
            images={[{ src: jpgBlobUrl, alt: "Template" }]}
            onClose={() => setIsImageViewerOpen(false)}
          />
        )}
      </CardContent>
      <CardFooter className="flex flex-row-reverse gap-2 p-4">
        <DropdownMenu>
          <DropdownMenuTrigger disabled={isLoadingTemplateSignedUrl || !templateData}>
            <Tooltip>
              <TooltipTrigger>
                <Button
                  className="group"
                  variant="secondary"
                  disabled={isLoadingTemplateSignedUrl || !templateData}
                >
                  <DownloadCloudIcon width={18} className="group-hover:text-primary" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download</TooltipContent>
            </Tooltip>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {psdBlobUrl && (
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => {
                  download(psdBlobUrl, `${template.name}.psd`);
                }}
              >
                PSD
              </DropdownMenuItem>
            )}
            {jpgBlobUrl && (
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => {
                  download(jpgBlobUrl, `${template.name}.jpeg`);
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
              disabled={isLoadingTemplateSignedUrl || isGeneratingTemplateJpg}
              onClick={async () => {
                if (templateData?.psd) {
                  generateTemplateJpg(template, templateData.psd);
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
              disabled={isLoadingTemplateSignedUrl || !templateData?.psd}
              onClick={async () => {
                if (templateData?.psd) {
                  openPhotopeaEditor(
                    {
                      title: template.name || "Untitled",
                      source_data_view: template.source_data_view,
                    },
                    templateData.psd,
                    {
                      onSave: handleTemplateSave,
                      isMetadataEditable: true,
                    },
                  );
                }
              }}
            >
              <PaintBrushIcon width={18} className="group-hover:text-primary" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit template</TooltipContent>
        </Tooltip>
      </CardFooter>
    </Card>
  );
};
