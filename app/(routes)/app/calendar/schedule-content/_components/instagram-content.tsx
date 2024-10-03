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
import { EditableCaption } from "@/src/components/ui/content/instagram/editable-caption";
import { InstagramIcon } from "@/src/components/ui/icons/instagram";
import { useTemplateStorageObjects } from "@/src/hooks/use-template-storage-objects";
import { generateCaption } from "@/src/libs/content";
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
    disableImageViewer = false,
    caption,
    onCaptionChange,
  }: {
    contentIdbKey: string;
    template: Tables<"templates">;
    scheduleData: ScheduleData;
    hideHeader?: boolean;
    className?: string;
    width?: number;
    disableImageViewer?: boolean;
    caption: string;
    onCaptionChange: (caption: string) => void;
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
            templateIdbKey={templateObjects[0].path}
            template={template}
            schedule={scheduleData}
            signedTemplateUrl={templateObjects[0].url}
            width={width}
            disableImageViewer={disableImageViewer}
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
                  templateIdbKey={obj.path}
                  template={template}
                  schedule={scheduleData}
                  signedTemplateUrl={obj.url}
                  width={width}
                  disableImageViewer={disableImageViewer}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselDots className="mb-4 mt-2" />
        </Carousel>
      );
    };

    return (
      <div className="w-full rounded-md bg-secondary sm:w-fit" key={contentIdbKey}>
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
        <div className="flex flex-col items-center p-3 sm:p-0">
          {/** if contentidbkey is a folder, then we render multiple design containers in a carousel
           * overwrite contentIdbKey: user_id/schedule_range/template_id/0,1,2.jpg and psd
           * generated design contentIdbKey:  user_id/schedule_range/template_id/0,1,2 this is only stored in indexedDB
           * DesignContainer will take care of whether to render overwrite or generated design
           */}
          {renderDesignContainer()}
        </div>
        {!_.isEmpty(scheduleData) && (
          <EditableCaption
            initialCaption={
              caption || generateCaption(template.ig_caption_template || "", scheduleData as any)
            }
            onSave={onCaptionChange}
          />
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.caption === nextProps.caption &&
      _.isEqual(prevProps.scheduleData, nextProps.scheduleData)
    );
  },
);
