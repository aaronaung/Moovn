"use client";
import { Spinner } from "@/src/components/common/loading-spinner";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/src/components/ui/tooltip";
import { toast } from "@/src/components/ui/use-toast";
import { supaClientComponentClient } from "@/src/data/clients/browser";
import { cn } from "@/src/utils";
import { Tables } from "@/types/db";
import { TrashIcon } from "@heroicons/react/24/outline";

import { useState } from "react";
import { InstagramIcon } from "@/src/components/ui/icons/instagram";
import InputTextArea from "@/src/components/ui/input/textarea";
import { ContentType } from "@/src/consts/content";
import TemplateContainer from "./template-container";
import {
  Carousel,
  CarouselContent,
  CarouselDots,
  CarouselItem,
} from "@/src/components/ui/carousel";
import { useTemplateStorageObjects } from "@/src/hooks/use-template-storage-objects";
import { GalleryHorizontal } from "lucide-react";
import { usePhotopeaEditor } from "@/src/contexts/photopea-editor";
import { DesignExport } from "@/src/contexts/photopea-headless";
import { upsertObjectAtPath } from "@/src/libs/storage";
import { BUCKETS } from "@/src/consts/storage";
import { db } from "@/src/libs/indexeddb/indexeddb";

export const TEMPLATE_WIDTH = 320;

export const InstagramTemplate = ({
  template,
  onDeleteTemplate,
}: {
  template: Tables<"templates">;
  onDeleteTemplate: () => void;
}) => {
  const { open: openPhotopeaEditor } = usePhotopeaEditor();
  const { templateObjects, isLoadingTemplateObjects } = useTemplateStorageObjects(template);
  const [isEditingIgCaption, setIsEditingIgCaption] = useState(false);
  const [igCaption, setIgCaption] = useState<string>(template.ig_caption_template || "");

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

  const handleAddToCarousel = async (designExport: DesignExport) => {
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

    let templatePathForNew;
    if (templateObjects.length > 1) {
      templatePathForNew = `${template.owner_id}/${template.id}/${templateObjects.length}`;
      await upsertObjectAtPath({
        bucket: BUCKETS.designTemplates,
        objectPath: templatePathForNew,
        client: supaClientComponentClient,
        content: designExport["psd"],
        contentType: "image/vnd.adobe.photoshop",
      });
    } else {
      // Delete the old template and design in idb.
      db.designs.where("templateId").equals(template.id).delete();
      db.templates.where("templateId").equals(template.id).delete();

      templatePathForNew = `${templateObjects[0].path}/1`;
      await supaClientComponentClient.storage
        .from(BUCKETS.designTemplates)
        .move(templateObjects[0].path, `${templateObjects[0].path}/0`);

      await upsertObjectAtPath({
        bucket: BUCKETS.designTemplates,
        objectPath: templatePathForNew,
        client: supaClientComponentClient,
        content: designExport["psd"],
        contentType: "image/vnd.adobe.photoshop",
      });
    }

    db.templates.put({
      key: templatePathForNew,
      templateId: template.id,
      jpg: designExport["jpg"],
      psd: designExport["psd"],
      lastUpdated: new Date(),
    });
  };

  const renderTemplateContainer = () => {
    if (isLoadingTemplateObjects) {
      return (
        <div
          className={`flex h-[${TEMPLATE_WIDTH}px] w-[${TEMPLATE_WIDTH}px] items-center justify-center`}
        >
          <Spinner />
        </div>
      );
    }
    if (templateObjects.length === 0) {
      return <p className="text-sm text-muted-foreground">Template not found.</p>;
    }
    if (templateObjects.length === 1) {
      return (
        <TemplateContainer
          templatePath={templateObjects[0].path}
          template={template}
          signedTemplateUrl={templateObjects[0].url}
        />
      );
    }
    return (
      <Carousel className="w-[320px]">
        <CarouselContent>
          {templateObjects.map((obj) => (
            <CarouselItem
              key={obj.path}
              className={cn(
                "flex max-h-full min-h-[250px] max-w-full cursor-pointer items-center justify-center hover:bg-secondary",
              )}
            >
              <TemplateContainer
                templatePath={obj.path}
                template={template}
                signedTemplateUrl={obj.url}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselDots className="mb-4 mt-2" />
      </Carousel>
    );
  };

  return (
    <Card className={`h-fit w-[320px] shrink-0`}>
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
            <Tooltip>
              <TooltipTrigger>
                <GalleryHorizontal
                  onClick={() => {
                    openPhotopeaEditor(
                      {
                        title: template.name || "Untitled",
                        source_data_view: template.source_data_view,
                        content_type: template.content_type,
                      },
                      new ArrayBuffer(0),
                      {
                        onSave: handleAddToCarousel,
                        isMetadataEditable: false,
                      },
                    );
                  }}
                  className="h-9 w-9 cursor-pointer rounded-full p-2 text-primary hover:bg-secondary"
                />
              </TooltipTrigger>
              <TooltipContent>
                {templateObjects.length > 1 ? "Add to carousel" : "Convert to carousel"}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardHeader>
      <CardContent className={`flex cursor-pointer items-center justify-center bg-secondary p-0`}>
        {renderTemplateContainer()}
      </CardContent>

      {template.content_type === ContentType.InstagramPost && (
        <div className="group mt-3 rounded-md px-3 pb-4">
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
