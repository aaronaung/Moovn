import { DESIGN_WIDTH, DesignContainer } from "@/src/components/common/design-container";
import { Spinner } from "@/src/components/common/loading-spinner";
import {
  Carousel,
  CarouselContent,
  CarouselDots,
  CarouselItem,
} from "@/src/components/ui/carousel";
import { InstagramIcon } from "@/src/components/ui/icons/instagram";
import { toast } from "@/src/components/ui/use-toast";
import { BUCKETS } from "@/src/consts/storage";
import { supaClientComponentClient } from "@/src/data/clients/browser";
import { renderCaption } from "@/src/libs/content";
import { ScheduleData } from "@/src/libs/sources/common";
import { signUrlForPathOrChildPaths } from "@/src/libs/storage";
import { cn } from "@/src/utils";
import { Tables } from "@/types/db";
import _ from "lodash";
import { memo, useEffect, useState } from "react";

export default memo(
  function InstagramContent({
    contentPath,
    template,
    scheduleData,
  }: {
    contentPath: string;
    template: Tables<"templates">;
    scheduleData: ScheduleData;
  }) {
    const [templateUrls, setTemplateUrls] = useState<string[]>([]);
    const [isLoadingTemplateUrls, setIsLoadingTemplateUrls] = useState(true);

    useEffect(() => {
      // Some templates - specifically instagram templates can have multiple child design templates for Carousel type posts.
      // We need to fetch the signed urls for all the child templates.
      const fetchTemplateUrls = async () => {
        try {
          setIsLoadingTemplateUrls(true);
          const signedUrls = await signUrlForPathOrChildPaths(
            BUCKETS.designTemplates,
            `${template.owner_id}/${template.id}`,
            supaClientComponentClient,
          );
          setTemplateUrls(signedUrls);
        } catch (e) {
          toast({
            title: "Error",
            variant: "destructive",
            description: "Failed to load templates",
          });
        } finally {
          setIsLoadingTemplateUrls(false);
        }
      };

      fetchTemplateUrls();
    }, []);

    const renderDesignContainer = () => {
      if (isLoadingTemplateUrls) {
        return (
          <div
            className={`flex h-[${DESIGN_WIDTH}px] w-[${DESIGN_WIDTH}px] items-center justify-center`}
          >
            <Spinner />
          </div>
        );
      }
      if (templateUrls.length === 0) {
        return <p className="text-sm text-muted-foreground">Template not found.</p>;
      }
      if (templateUrls.length === 1) {
        return (
          <DesignContainer
            contentPath={contentPath}
            schedule={scheduleData}
            template={template}
            signedTemplateUrl={templateUrls[0]}
          />
        );
      }
      return (
        <Carousel className="w-[300px]">
          <CarouselContent>
            {templateUrls.map((url) => (
              <CarouselItem
                key={url}
                className={cn(
                  "flex max-h-full min-h-[250px] max-w-full cursor-pointer items-center justify-center hover:bg-secondary",
                )}
              >
                <DesignContainer
                  contentPath={contentPath}
                  schedule={scheduleData}
                  template={template}
                  signedTemplateUrl={url}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselDots className="mt-4" />
        </Carousel>
      );
    };

    return (
      <div className="w-fit rounded-md bg-secondary" key={contentPath}>
        <div className="flex items-center gap-x-1 px-3 py-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <InstagramIcon className="h-4 w-4 fill-purple-600 text-secondary-foreground" />
              <p className="text-xs font-medium text-pink-600">
                {template.content_type.split(" ")[1]}
              </p>
            </div>
          </div>
        </div>
        <div className={cn("flex flex-col items-center")}>
          {/** if contentpath is a folder, then we render multiple design containers in a carousel
           * overwrite contentPath: user_id/schedule_range/template_id/0,1,2.jpg and psd
           * generated design contentPath:  user_id/schedule_range/template_id/0,1,2 this is only stored in indexedDB
           * DesignContainer will take care of whether to render overwrite or generated design
           */}
          {renderDesignContainer()}
        </div>
        {!_.isEmpty(scheduleData) && template.ig_caption_template && (
          <p
            className={`overflow-scroll whitespace-pre-wrap text-sm max-w-[${DESIGN_WIDTH}px] p-2`}
          >
            {renderCaption(template.ig_caption_template || "", scheduleData as any)}
          </p>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    return _.isEqual(prevProps, nextProps);
  },
);
