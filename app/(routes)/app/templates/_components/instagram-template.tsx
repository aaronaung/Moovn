"use client";
import { Spinner } from "@/src/components/common/loading-spinner";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/src/components/ui/tooltip";
import { toast } from "@/src/components/ui/use-toast";
import { cn } from "@/src/utils";
import { Tables } from "@/types/db";
import { TrashIcon } from "@heroicons/react/24/outline";

import { InstagramIcon } from "@/src/components/ui/icons/instagram";
import { ContentType } from "@/src/consts/content";
import TemplateContainer from "./template-container";
import {
  Carousel,
  CarouselContent,
  CarouselDots,
  CarouselItem,
} from "@/src/components/ui/carousel";
import { GalleryHorizontal, MailIcon } from "lucide-react";
import { useSupaMutation, useSupaQuery } from "@/src/hooks/use-supabase";
import { getTemplateItemsByTemplateId, saveTemplate } from "@/src/data/templates";
import { EditableCaption } from "@/src/components/ui/content/instagram/editable-caption";

export const TEMPLATE_WIDTH = 320;

export const InstagramTemplate = ({
  template,
  onDeleteTemplate,
  onAddToCarousel,
  designRequest,
}: {
  template: Tables<"templates">;
  onDeleteTemplate: () => void;
  onAddToCarousel: (template: Tables<"templates">) => void;
  designRequest?: Tables<"template_item_design_requests">;
}) => {
  const { data: templateItems, isLoading: isLoadingTemplateItems } = useSupaQuery(
    getTemplateItemsByTemplateId,
    {
      arg: template.id,
      queryKey: ["getTemplateItemsByTemplateId", template.id],
    },
  );

  const { mutateAsync: _saveTemplate } = useSupaMutation(saveTemplate, {
    invalidate: [["getAllTemplates"]],
  });

  const handleUpdateIgCaption = async (newIgCaption: string) => {
    try {
      await _saveTemplate({
        ...template,
        ig_caption_template: newIgCaption,
      } as Tables<"templates">);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to update caption. Please try again or contact support.",
      });
    }
  };

  const renderTemplateContainer = () => {
    if (isLoadingTemplateItems) {
      return (
        <div
          style={{ width: TEMPLATE_WIDTH, height: TEMPLATE_WIDTH }}
          className={`flex items-center justify-center`}
        >
          <Spinner />
        </div>
      );
    }
    if (templateItems?.length === 0) {
      return <p className="p-2 text-sm text-muted-foreground">Template not found.</p>;
    }
    if (templateItems?.length === 1) {
      return (
        <TemplateContainer
          template={template}
          templateItem={templateItems[0]}
          hideActions={!!designRequest}
        />
      );
    }
    return (
      <Carousel className="w-[320px]">
        <CarouselContent>
          {(templateItems ?? []).map((item) => (
            <CarouselItem
              key={item.id}
              className={cn(
                "flex max-h-full min-h-[250px] max-w-full cursor-pointer items-center justify-center hover:bg-secondary",
              )}
            >
              <TemplateContainer
                template={template}
                templateItem={item}
                hideActions={!!designRequest}
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
      {designRequest && (
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
                {(templateItems || []).length > 1 ? "Add to carousel" : "Convert to carousel"}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardHeader>
      <CardContent className={`flex cursor-pointer items-center justify-center bg-secondary p-0`}>
        {renderTemplateContainer()}
      </CardContent>

      {template.content_type === ContentType.InstagramPost && !designRequest && (
        <EditableCaption
          initialCaption={template.ig_caption_template || ""}
          onSave={handleUpdateIgCaption}
          className="px-3 pb-4"
        />
      )}
    </Card>
  );
};
