import { ContentType } from "@/src/consts/content";
import { ScheduleData } from "@/src/libs/sources";
import { Tables } from "@/types/db";
import InstagramContent from "./instagram-content";
import { Checkbox } from "@/src/components/ui/checkbox";
import { DateTimePicker } from "@/src/components/ui/date-time-picker";
import { cn } from "@/src/utils";
import { memo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/src/components/ui/tooltip";
import { useDesignGenQueue } from "@/src/contexts/design-gen-queue";

export default memo(
  function ContentListItem({
    contentIdbKey,
    scheduleData,
    template,
    isSelected,
    onSelectChange,
    publishDateTime,
    onPublishDateTimeChange,
  }: {
    contentIdbKey: string;
    scheduleData: ScheduleData;
    template: Tables<"templates">;
    isSelected: boolean;
    onSelectChange: (selected: boolean) => void;
    publishDateTime: { date: Date; error: string | undefined };
    onPublishDateTimeChange: (dateTime: { date: Date; error: string | undefined }) => void;
  }) {
    const { isJobPending } = useDesignGenQueue();
    const renderContent = () => {
      let contentComp = <></>;
      switch (template.content_type) {
        case ContentType.InstagramPost:
        case ContentType.InstagramStory:
          contentComp = (
            <InstagramContent
              key={contentIdbKey}
              contentIdbKey={contentIdbKey}
              scheduleData={scheduleData}
              template={template}
            />
          );
          break;
        default:
          return <></>;
      }
      return contentComp;
    };

    const designLoading = isJobPending(contentIdbKey);
    return (
      <div className="flex w-full flex-col gap-2 sm:w-fit">
        <div className="ml-1 flex items-center gap-2">
          <Checkbox
            disabled={designLoading || !!publishDateTime.error}
            checked={!!publishDateTime.error ? false : isSelected}
            onCheckedChange={(checked: boolean) => onSelectChange(checked)}
          />
          <Tooltip>
            <TooltipTrigger className="w-full">
              <DateTimePicker
                isDisabled={designLoading}
                value={{
                  date: publishDateTime.date,
                  hasTime: true,
                }}
                disablePastDateTime
                className={cn(
                  "h-[32px] w-full min-w-0 rounded-md px-3",
                  publishDateTime.error && "border-2 border-red-500",
                )}
                onChange={(dateTime) => {
                  onPublishDateTimeChange({
                    date: dateTime.date,
                    error: dateTime.error,
                  });
                }}
              />
            </TooltipTrigger>
            <TooltipContent>
              {publishDateTime.error ? (
                <p className="text-xs text-red-500">{publishDateTime.error}</p>
              ) : (
                `Date time to publish`
              )}
            </TooltipContent>
          </Tooltip>
        </div>
        <div
          className={cn("m-1", isSelected && "rounded-md")}
          style={{
            boxShadow: isSelected ? "0 0 0 2px #4CAF50" : "none" /* emulate the border */,
          }}
        >
          {renderContent()}
        </div>
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.contentIdbKey === next.contentIdbKey &&
      prev.isSelected === next.isSelected &&
      prev.publishDateTime === next.publishDateTime &&
      prev.scheduleData === next.scheduleData
    );
  },
);
