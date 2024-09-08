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
import { DownloadCloudIcon } from "lucide-react";
import { download } from "@/src/utils";
import { PaintBrushIcon } from "@heroicons/react/24/outline";
import { uploadObject } from "@/src/data/r2";

const ImageViewer = dynamic(() => import("react-viewer"), { ssr: false });

export default function TemplateContainer({
  template,
  templatePath,
  signedTemplateUrl,
}: {
  template: Tables<"templates">;
  templatePath: string;
  signedTemplateUrl: string;
}) {
  const { open: openPhotopeaEditor } = usePhotopeaEditor();
  const { generateTemplateJpg, isLoading: isGeneratingTemplateJpg } = useGenerateTemplateJpg();
  const [isLoadingTemplateSignedUrl, setIsLoadingTemplateSignedUrl] = useState(false);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const templateFromIdb = useLiveQuery(async () => {
    const template = await db.templates.get(templatePath);
    if (!template) {
      return undefined;
    }
    return {
      jpgUrl: URL.createObjectURL(new Blob([template.jpg], { type: "image/jpeg" })),
      psdUrl: URL.createObjectURL(new Blob([template.psd], { type: "image/vnd.adobe.photoshop" })),
      psd: template.psd,
    };
  });

  useEffect(() => {
    const generateTemplate = async () => {
      try {
        setIsLoadingTemplateSignedUrl(true);
        const fromdb = await db.templates.get(templatePath);
        if (fromdb?.jpg && fromdb?.psd) {
          setIsLoadingTemplateSignedUrl(false);
          return;
        }
        generateTemplateJpg({ template, templatePath, signedTemplateUrl });
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

    generateTemplate();
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
      uploadObject("templates", templatePath, new Blob([designExport["psd"]])),
      db.designs.where("templateId").equals(template.id).delete(), // Bust design cache since the template has changed, so we can regenerate the design.
      db.templates.put({
        key: templatePath,
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
    if (isLoadingTemplateSignedUrl || isGeneratingTemplateJpg || !templateFromIdb?.jpgUrl) {
      return (
        <div className={`flex h-[320px] w-[320px] items-center justify-center`}>
          <Spinner />
        </div>
      );
    }
    return (
      <img
        src={templateFromIdb.jpgUrl}
        onClick={() => setIsImageViewerOpen(true)}
        alt="Template"
        className=" h-full w-full object-contain"
      />
    );
  };

  return (
    <div style={{ width: TEMPLATE_WIDTH }}>
      <div
        style={{ minHeight: TEMPLATE_WIDTH }}
        className={`relative flex cursor-pointer items-center justify-center bg-secondary p-0`}
      >
        {renderTemplateContent()}
        {templateFromIdb?.jpgUrl && (
          <ImageViewer
            visible={isImageViewerOpen}
            onMaskClick={() => setIsImageViewerOpen(false)}
            images={[{ src: templateFromIdb.jpgUrl, alt: "Template" }]}
            onClose={() => setIsImageViewerOpen(false)}
          />
        )}
      </div>
      <div className="flex justify-center gap-2 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger disabled={isLoadingTemplateSignedUrl || !templateFromIdb}>
            <Tooltip>
              <TooltipTrigger>
                <Button
                  className="group hover:bg-secondary-foreground hover:text-secondary"
                  variant="secondary"
                  disabled={isLoadingTemplateSignedUrl || !templateFromIdb}
                >
                  <DownloadCloudIcon width={18} className="group-hover:text-secondary" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download</TooltipContent>
            </Tooltip>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {templateFromIdb?.psdUrl && (
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => {
                  download(templateFromIdb.psdUrl, `${template.name}.psd`);
                }}
              >
                PSD
              </DropdownMenuItem>
            )}
            {templateFromIdb?.jpgUrl && (
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => {
                  download(templateFromIdb.jpgUrl, `${template.name}.jpg`);
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
              className="group hover:bg-secondary-foreground hover:text-secondary"
              disabled={isLoadingTemplateSignedUrl || !templateFromIdb?.psd}
              onClick={async () => {
                if (templateFromIdb?.psd) {
                  openPhotopeaEditor(
                    {
                      title: template.name || "Untitled",
                      source_data_view: template.source_data_view,
                      content_type: template.content_type,
                    },
                    templateFromIdb.psd,
                    {
                      onSave: handleTemplateSave,
                      isMetadataEditable: true,
                    },
                  );
                }
              }}
            >
              <PaintBrushIcon width={18} className="group-hover:text-secondary" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit template</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
