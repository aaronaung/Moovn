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
import { DesignExport } from "@/src/contexts/photopea-headless";
import { supaClientComponentClient } from "@/src/data/clients/browser";
import { cn, download } from "@/src/utils";
import { Tables } from "@/types/db";
import { PaintBrushIcon, TrashIcon } from "@heroicons/react/24/outline";

import { DownloadCloudIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { signUrl, upsertObjectAtPath } from "@/src/libs/storage";
import { useGenerateTemplateJpg } from "@/src/hooks/use-generate-template-jpg";
import { db } from "@/src/libs/indexeddb/indexeddb";
import { InstagramIcon } from "@/src/components/ui/icons/instagram";
import InputTextArea from "@/src/components/ui/input/textarea";
import { ContentType } from "@/src/consts/content";

const ImageViewer = dynamic(() => import("react-viewer"), { ssr: false });

export const TEMPLATE_WIDTH = 320;

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
  const [isEditingIgCaption, setIsEditingIgCaption] = useState(false);
  const [igCaption, setIgCaption] = useState<string>(template.ig_caption_template || "");

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
        if (
          templateFromIndexedDb?.jpg &&
          templateFromIndexedDb?.psd &&
          templateFromIndexedDb.jpg.byteLength > 0 &&
          templateFromIndexedDb.psd.byteLength > 0
        ) {
          setTemplateData({
            jpg: templateFromIndexedDb.jpg,
            psd: templateFromIndexedDb.psd,
          });
        } else {
          const psdSignedUrl = await signUrl({
            bucket: BUCKETS.designTemplates,
            objectPath: `${template.owner_id}/${template.id}.psd`,
            client: supaClientComponentClient,
          });

          const psd = await (await fetch(psdSignedUrl)).arrayBuffer();
          generateTemplateJpg(template, psd);
          setTemplateData((prev) => ({
            ...prev,
            psd,
          }));
          await db.templates.put({
            templateId: template.id,
            jpg: new ArrayBuffer(0), // We don't have the jpg yet, so just store an empty array buffer.
            psd,
            lastUpdated: new Date(),
          });
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

  const handleUpdateIgCaption = async () => {
    try {
      await supaClientComponentClient
        .from("templates")
        .update({
          ig_caption_template: igCaption,
        })
        .eq("id", template.id);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to update caption. Please try again or contact support.",
      });
    }
  };

  const handleTemplateSave = async (
    designExport: DesignExport,
    metadataChanges: Partial<PhotopeaEditorMetadata>,
  ) => {
    if (!designExport["psd"] || !designExport["jpg"]) {
      console.error("missing psd or jpg file in export:", {
        designExport,
      });
      toast({
        variant: "destructive",
        title: "Failed to save template. Please try again or contact support.",
      });
      return;
    }

    await Promise.all([
      upsertObjectAtPath({
        bucket: BUCKETS.designTemplates,
        objectPath: `${template.owner_id}/${template.id}.psd`,
        client: supaClientComponentClient,
        content: designExport["psd"],
        contentType: "image/vnd.adobe.photoshop",
      }),
      db.designs.where("templateId").equals(template.id).delete(), // Bust design cache since the template has changed, so we can regenerate the design.
      db.templates.put({
        templateId: template.id,
        jpg: designExport["jpg"],
        psd: designExport["psd"],
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

  const renderTemplateContent = () => {
    if (isLoadingTemplateSignedUrl || isGeneratingTemplateJpg || !jpgBlobUrl) {
      return <Spinner />;
    }
    return (
      <img
        src={jpgBlobUrl}
        onClick={() => setIsImageViewerOpen(true)}
        alt="Template"
        className=" h-full w-full object-contain"
      />
    );
  };

  return (
    <Card className={`h-fit w-[${TEMPLATE_WIDTH}px] shrink-0`}>
      <CardHeader className="py-4 pl-4 pr-2">
        <div className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <InstagramIcon className="h-5 w-5 fill-purple-600 text-secondary-foreground" />
            <p className="text-xs font-medium text-pink-600">
              {template.content_type.split(" ")[1]}
            </p>
          </div>
          <div className="ml-4 flex-1">
            <p className="mb-1 line-clamp-2 flex-1 text-sm font-medium">
              {template.name || "Untitled"}
            </p>
            <p className="text-xs text-muted-foreground">
              Schedule type: <b>{template.source_data_view}</b>
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

      <CardFooter className="flex justify-center gap-2 py-3">
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
                  download(jpgBlobUrl, `${template.name}.jpg`);
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
              disabled={isLoadingTemplateSignedUrl || !templateData?.psd}
              onClick={async () => {
                if (templateData?.psd) {
                  openPhotopeaEditor(
                    {
                      title: template.name || "Untitled",
                      source_data_view: template.source_data_view,
                      content_type: template.content_type,
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
      {template.content_type === ContentType.InstagramPost && (
        <div className="group rounded-md px-3 pb-4">
          {isEditingIgCaption ? (
            <div>
              <InputTextArea
                value={igCaption || null}
                onChange={(e) => {
                  setIgCaption(e.target.value);
                }}
                className="mt-0"
                inputProps={
                  {
                    placeholder: "Add caption for Instagram post",
                    rows: Math.min(12, igCaption.split("\n").length),
                  } as React.TextareaHTMLAttributes<HTMLTextAreaElement>
                }
              />
              <Button
                onClick={() => {
                  setIsEditingIgCaption(false);
                  handleUpdateIgCaption();
                }}
                className="mt-2 w-full rounded-md"
                size={"sm"}
              >
                Save
              </Button>
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger className="w-full">
                <p
                  onClick={() => {
                    setIsEditingIgCaption(true);
                  }}
                  className={cn(
                    "max-h-[300px] w-full cursor-pointer overflow-scroll whitespace-pre-wrap p-2 text-left text-sm group-hover:bg-secondary",
                    !igCaption && "text-muted-foreground",
                  )}
                >
                  {igCaption || "Add caption for Instagram post here..."}
                </p>
              </TooltipTrigger>
              <TooltipContent>Click to {!igCaption ? "add" : "edit"}</TooltipContent>
            </Tooltip>
          )}
        </div>
      )}
    </Card>
  );
};
