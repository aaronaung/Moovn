import {
  DESIGN_WIDTH,
  DesignContainer,
} from "@/app/(routes)/app/calendar/schedule-content/_components/design-container";
import { Spinner } from "@/src/components/common/loading-spinner";
import {
  Carousel,
  CarouselContent,
  CarouselDots,
  CarouselItem,
} from "@/src/components/ui/carousel";
import { InstagramIcon } from "@/src/components/ui/icons/instagram";
import { useTemplateStorageObjects } from "@/src/hooks/use-template-storage-objects";
import { renderCaption } from "@/src/libs/content";
import { ScheduleData } from "@/src/libs/sources";
import { cn } from "@/src/utils";
import { Tables } from "@/types/db";
import _ from "lodash";
import { memo } from "react";

export default memo(
  function InstagramContent({
    contentIdbKey,
    template,
    scheduleData,
    hideHeader,
    className,
    width = DESIGN_WIDTH,
  }: {
    contentIdbKey: string;
    template: Tables<"templates">;
    scheduleData: ScheduleData;
    hideHeader?: boolean;
    className?: string;
    width?: number;
  }) {
    const { templateObjects, isLoadingTemplateObjects } = useTemplateStorageObjects(template);

    const renderDesignContainer = () => {
      if (isLoadingTemplateObjects) {
        return (
          <div
            style={{
              width,
              height: width,
            }}
            className={cn(`flex items-center justify-center rounded-md`, className)}
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
          <DesignContainer
            contentIdbKey={contentIdbKey}
            schedule={scheduleData}
            template={template}
            signedTemplateUrl={templateObjects[0].url}
            width={width}
          />
        );
      }
      return (
        <Carousel style={{ width }}>
          <CarouselContent>
            {templateObjects.map((obj) => (
              <CarouselItem
                key={obj.path}
                className={cn(
                  "flex max-h-full min-h-[250px] max-w-full cursor-pointer items-center justify-center hover:bg-secondary",
                )}
              >
                <DesignContainer
                  contentIdbKey={`${contentIdbKey}/${obj.path.split("/").pop()}`}
                  schedule={scheduleData}
                  template={template}
                  signedTemplateUrl={obj.url}
                  width={width}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselDots className="mb-4 mt-2" />
        </Carousel>
      );
    };

    return (
      <div className="w-fit rounded-md bg-secondary" key={contentIdbKey}>
        {!hideHeader && (
          <div className="flex items-center gap-x-1 px-3 py-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <InstagramIcon className="h-4 w-4 fill-purple-600 text-secondary-foreground" />
                <p className="text-xs font-medium text-pink-600">
                  {template.content_type?.split(" ")[1]}
                </p>
              </div>
            </div>
          </div>
        )}
        <div className={cn("flex flex-col items-center")}>
          {/** if contentidbkey is a folder, then we render multiple design containers in a carousel
           * overwrite contentIdbKey: user_id/schedule_range/template_id/0,1,2.jpg and psd
           * generated design contentIdbKey:  user_id/schedule_range/template_id/0,1,2 this is only stored in indexedDB
           * DesignContainer will take care of whether to render overwrite or generated design
           */}
          {renderDesignContainer()}
        </div>
        {!_.isEmpty(scheduleData) && template.ig_caption_template && (
          <p
            className={`overflow-scroll whitespace-pre-wrap p-2 text-sm`}
            style={{ maxWidth: width }}
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
