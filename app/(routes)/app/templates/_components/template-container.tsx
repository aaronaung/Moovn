import { Tables } from "@/types/db";
import { TEMPLATE_WIDTH } from "./instagram-template";
import { Spinner } from "@/src/components/common/loading-spinner";
import { PhotopeaEditorMetadata, usePhotopeaEditor } from "@/src/contexts/photopea-editor";
import { useGenerateTemplateJpg } from "@/src/hooks/use-generate-template-jpg";
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/src/libs/indexeddb/indexeddb";
import { supaClientComponentClient } from "@/src/data/clients/browser";
import { toast } from "@/src/components/ui/use-toast";
import { DesignExport } from "@/src/contexts/photopea-headless";
import dynamic from "next/dynamic";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/src/components/ui/tooltip";
import { Button } from "@/src/components/ui/button";
import { DownloadCloudIcon, FileIcon, PencilIcon } from "lucide-react";
import { download } from "@/src/utils";
import { PaintBrushIcon } from "@heroicons/react/24/outline";
import { uploadObject } from "@/src/data/r2";
import { ContentItemType } from "@/src/consts/content";
import { GoogleDriveIcon } from "@/src/components/ui/icons/google";
import { DriveTemplateItemMetadata } from "@/src/consts/templates";

const ImageViewer = dynamic(() => import("react-viewer"), { ssr: false });

export default function TemplateContainer({
  template,
  templateItem,
  hideActions = false,
  onEdit,
}: {
  template: Tables<"templates">;
  templateItem: Tables<"template_items">;
  hideActions?: boolean;
  onEdit?: (templateItem: Tables<"template_items">) => void;
}) {
  const { open: openPhotopeaEditor } = usePhotopeaEditor();
  const { generateTemplateJpg, isLoading: isGeneratingTemplateJpg } = useGenerateTemplateJpg();
  const [isLoadingTemplateSignedUrl, setIsLoadingTemplateSignedUrl] = useState(false);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const idbTemplateItem = useLiveQuery(async () => {
    const idbTemplateItem = await db.templateItems.get(templateItem.id);
    if (!idbTemplateItem || !idbTemplateItem.jpg || !idbTemplateItem.psd) {
      return undefined;
    }
    return {
      jpgUrl: URL.createObjectURL(new Blob([idbTemplateItem.jpg], { type: "image/jpeg" })),
      psdUrl: URL.createObjectURL(
        new Blob([idbTemplateItem.psd], { type: "image/vnd.adobe.photoshop" }),
      ),
      psd: idbTemplateItem.psd,
    };
  });

  useEffect(() => {
    const generateTemplate = async () => {
      try {
        setIsLoadingTemplateSignedUrl(true);
        const fromdb = await db.templateItems.get(templateItem.id);
        if (fromdb?.jpg && fromdb?.psd) {
          setIsLoadingTemplateSignedUrl(false);
          return;
        }
        if (templateItem.type === ContentItemType.AutoGenDesign) {
          generateTemplateJpg({
            template,
            templateItem,
          });
        }
      } catch (err) {
        console.error("Failed to generate template jpg:", err);
        toast({
          variant: "destructive",
          title: "Failed to load template. Please try again or contact support.",
        });
      } finally {
        setIsLoadingTemplateSignedUrl(false);
      }
    };

    if (templateItem.type === ContentItemType.AutoGenDesign) {
      generateTemplate();
    }
  }, []);

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
      uploadObject(
        "templates",
        `${template.id}/${templateItem.id}`,
        new Blob([designExport["psd"]]),
      ),
      db.contentItems.where("template_item_id").equals(templateItem.id).delete(), // Bust design cache since the template has changed, so we can regenerate the design.
      db.templateItems.put({
        key: templateItem.id,
        position: templateItem.position,
        template_id: template.id,
        jpg: designExport["jpg"],
        psd: designExport["psd"],
        updated_at: new Date(),
        created_at: new Date(),
        type: templateItem.type as ContentItemType,
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
    if (isLoadingTemplateSignedUrl || isGeneratingTemplateJpg) {
      return (
        <div className={`flex h-[320px] w-[320px] items-center justify-center`}>
          <Spinner />
        </div>
      );
    }
    if (templateItem.type === ContentItemType.AutoGenDesign && !idbTemplateItem?.jpgUrl) {
      return <p>No template image found.</p>;
    }

    switch (templateItem.type) {
      case ContentItemType.AutoGenDesign:
        return (
          <img
            src={idbTemplateItem!.jpgUrl}
            onClick={() => setIsImageViewerOpen(true)}
            alt="Template"
            className=" h-full w-full object-contain"
          />
        );
      case ContentItemType.DriveFile:
        if (!templateItem.metadata) {
          return null;
        }
        const metadata = templateItem.metadata as DriveTemplateItemMetadata;
        return (
          <div className="flex flex-col items-center justify-center">
            <GoogleDriveIcon className="h-12 w-12" />
            <div className="mt-2 flex items-center">
              <FileIcon className="mr-1 h-4 w-4" />
              <p className="text-sm font-medium">
                {metadata.drive_folder_name}/YYYY-MM-DD/{metadata.drive_file_name}
              </p>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              e.g. {metadata.drive_folder_name}/{new Date().toISOString().split("T")[0]}/
              {metadata.drive_file_name}
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ width: TEMPLATE_WIDTH }}>
      <div
        style={{ minHeight: TEMPLATE_WIDTH }}
        className={`relative flex cursor-pointer items-center justify-center bg-secondary p-0`}
      >
        {renderTemplateContent()}
        {templateItem.type === ContentItemType.AutoGenDesign && idbTemplateItem?.jpgUrl && (
          <ImageViewer
            visible={isImageViewerOpen}
            onMaskClick={() => setIsImageViewerOpen(false)}
            images={[{ src: idbTemplateItem.jpgUrl, alt: "Template" }]}
            onClose={() => setIsImageViewerOpen(false)}
          />
        )}
      </div>
      {!hideActions && (
        <div className="flex justify-center gap-2 py-3">
          {templateItem.type === ContentItemType.AutoGenDesign && (
            <DropdownMenu>
              <DropdownMenuTrigger disabled={isLoadingTemplateSignedUrl || !idbTemplateItem}>
                <Tooltip>
                  <TooltipTrigger>
                    <Button
                      className="group hover:bg-secondary-foreground hover:text-secondary"
                      variant="secondary"
                      disabled={isLoadingTemplateSignedUrl || !idbTemplateItem}
                    >
                      <DownloadCloudIcon width={18} className="group-hover:text-secondary" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Download</TooltipContent>
                </Tooltip>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {idbTemplateItem?.psdUrl && (
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => {
                      download(idbTemplateItem.psdUrl, `${template.name}.psd`);
                    }}
                  >
                    PSD
                  </DropdownMenuItem>
                )}
                {idbTemplateItem?.jpgUrl && (
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => {
                      download(idbTemplateItem.jpgUrl, `${template.name}.jpg`);
                    }}
                  >
                    JPEG
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Tooltip>
            <TooltipTrigger>
              <Button
                variant="secondary"
                className="group hover:bg-secondary-foreground hover:text-secondary"
                disabled={
                  isLoadingTemplateSignedUrl ||
                  (templateItem.type === ContentItemType.AutoGenDesign && !idbTemplateItem?.psd)
                }
                onClick={async () => {
                  switch (templateItem.type) {
                    case ContentItemType.AutoGenDesign:
                      if (idbTemplateItem?.psd) {
                        openPhotopeaEditor(
                          {
                            title: template.name || "Untitled",
                            source_data_view: template.source_data_view,
                            content_type: template.content_type,
                          },
                          idbTemplateItem.psd,
                          {
                            onSave: handleTemplateSave,
                            isMetadataEditable: true,
                          },
                        );
                      }
                      break;
                    case ContentItemType.DriveFile:
                      onEdit?.(templateItem);
                      break;
                    default:
                      break;
                  }
                }}
              >
                {templateItem.type === ContentItemType.AutoGenDesign ? (
                  <PaintBrushIcon width={18} className="group-hover:text-secondary" />
                ) : (
                  <PencilIcon width={18} className="group-hover:text-secondary" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit template</TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  );
}
