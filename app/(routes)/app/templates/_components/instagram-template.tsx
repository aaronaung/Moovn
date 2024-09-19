"use client";
import { Spinner } from "@/src/components/common/loading-spinner";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/src/components/ui/tooltip";
import { toast } from "@/src/components/ui/use-toast";
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
import { GalleryHorizontal, MailIcon } from "lucide-react";
import { useSupaMutation } from "@/src/hooks/use-supabase";
import { saveTemplate } from "@/src/data/templates";

export const TEMPLATE_WIDTH = 320;

export const InstagramTemplate = ({
  template,
  onDeleteTemplate,
  onAddToCarousel,
  templateCreationRequest,
}: {
  template: Tables<"templates">;
  onDeleteTemplate: () => void;
  onAddToCarousel: (template: Tables<"templates">) => void;
  templateCreationRequest?: Tables<"template_creation_requests">;
}) => {
  const { templateObjects, isLoadingTemplateObjects } = useTemplateStorageObjects(template);
  const [isEditingIgCaption, setIsEditingIgCaption] = useState(false);
  const [igCaption, setIgCaption] = useState<string>(template.ig_caption_template || "");

  const { mutateAsync: _saveTemplate } = useSupaMutation(saveTemplate, {
    invalidate: [["getTemplatesForAuthUser"]],
  });

  const handleUpdateIgCaption = async () => {
    try {
      await _saveTemplate({
        ...template,
        ig_caption_template: igCaption,
      } as Tables<"templates">);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to update caption. Please try again or contact support.",
      });
    }
  };

  const renderTemplateContainer = () => {
    if (isLoadingTemplateObjects) {
      return (
        <div
          style={{ width: TEMPLATE_WIDTH, height: TEMPLATE_WIDTH }}
          className={`flex items-center justify-center`}
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
          hideActions={!!templateCreationRequest}
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
                hideActions={!!templateCreationRequest}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselDots className="bg-secondary pb-4" />
      </Carousel>
    );
  };

  return (
    <Card className={`h-fit w-[320px] shrink-0`}>
      {templateCreationRequest && (
        <div className="flex flex-col gap-1 rounded-t-md bg-orange-300 p-2 text-center text-xs dark:bg-orange-700">
          <Tooltip>
            <TooltipTrigger className="w-full">
              <p>Our team is actively working on this template.</p>
            </TooltipTrigger>
            <TooltipContent className="max-w-[420px]">
              We have received your request to work on this template. This banner will disappear
              once the template is ready.
            </TooltipContent>
          </Tooltip>
          <p className="text-center text-primary hover:underline">
            <span className="flex items-center justify-center gap-1">
              <MailIcon className="h-3 w-3" />
              <a href="mailto:team@moovn.co">team@moovn.co</a>
            </span>
          </p>
        </div>
      )}
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
            {!templateCreationRequest && (
              <Tooltip>
                <TooltipTrigger>
                  <GalleryHorizontal
                    onClick={() => {
                      onAddToCarousel(template);
                    }}
                    className="h-9 w-9 cursor-pointer rounded-full p-2 text-primary hover:bg-secondary"
                  />
                </TooltipTrigger>
                <TooltipContent>
                  {templateObjects.length > 1 ? "Add to carousel" : "Convert to carousel"}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className={`flex cursor-pointer items-center justify-center bg-secondary p-0`}>
        {renderTemplateContainer()}
      </CardContent>

      {template.content_type === ContentType.InstagramPost && !templateCreationRequest && (
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
