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
import { ContentItemType } from "@/src/consts/content";
import { getTemplateItemsByTemplateId } from "@/src/data/templates";
import { useSupaQuery } from "@/src/hooks/use-supabase";
import { generateCaption } from "@/src/libs/content";
import { ScheduleData } from "@/src/libs/sources";
import { cn } from "@/src/utils";
import { Tables } from "@/types/db";
import _ from "lodash";
import { memo } from "react";

export const InstagramContent = memo(
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
    const { data: templateItems, isLoading: isLoadingTemplateItems } = useSupaQuery(
      getTemplateItemsByTemplateId,
      {
        arg: template.id,
        queryKey: ["getTemplateItemsByTemplateId", template.id],
      },
    );

    const renderDesignContainer = () => {
      if (isLoadingTemplateItems || !templateItems) {
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
      if (templateItems.length === 0) {
        return <p className="p-2 text-sm text-muted-foreground">Template not found.</p>;
      }
      if (templateItems.length === 1) {
        return (
          <ContentContainer
            contentIdbKey={contentIdbKey}
            template={template}
            templateItem={templateItems[0]}
            schedule={scheduleData}
            width={width}
            disableImageViewer={disableImageViewer}
          />
        );
      }
      return (
        <Carousel style={{ width }}>
          <CarouselContent>
            {(templateItems ?? []).map((item) => (
              <CarouselItem
                key={item.id}
                className={cn(
                  "flex max-h-full min-h-[250px] max-w-full cursor-pointer items-center justify-center hover:bg-secondary",
                )}
              >
                <ContentContainer
                  contentIdbKey={contentIdbKey}
                  template={template}
                  templateItem={item}
                  schedule={scheduleData}
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

const ContentContainer = ({
  contentIdbKey,
  template,
  templateItem,
  schedule,
  width = DESIGN_WIDTH,
  disableImageViewer = false,
}: {
  contentIdbKey: string;
  template: Tables<"templates">;
  templateItem: Tables<"template_items">;
  schedule: ScheduleData;
  width?: number;
  disableImageViewer?: boolean;
}) => {
  if (templateItem.type === ContentItemType.DriveFile) {
    return <div>Video</div>;
  }
  return (
    <DesignContainer
      contentIdbKey={contentIdbKey}
      template={template}
      templateItem={templateItem}
      schedule={schedule}
      width={width}
      disableImageViewer={disableImageViewer}
    />
  );
};
