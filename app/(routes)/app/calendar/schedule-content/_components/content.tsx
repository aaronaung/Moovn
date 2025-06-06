import React, { memo, useCallback } from "react";
import { ContentType } from "@/src/consts/content";
import { ScheduleData } from "@/src/libs/sources";
import { Tables } from "@/types/db";
import { InstagramContent } from "./instagram-content";
import { Checkbox } from "@/src/components/ui/checkbox";
import { DateTimePicker } from "@/src/components/ui/date-time-picker";
import { cn } from "@/src/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/src/components/ui/tooltip";
import { useDesignGenQueue } from "@/src/contexts/design-gen-queue";
import _ from "lodash";

interface ContentProps {
  contentIdbKey: string;
  scheduleData: ScheduleData;
  template: Tables<"templates">;
  isSelected: boolean;
  onSelectChange: (selected: boolean) => void;
  publishDateTime: { date: Date; error: string | undefined };
  onPublishDateTimeChange: (dateTime: { date: Date; error: string | undefined }) => void;
  caption: string;
  onCaptionChange: (caption: string) => void;
}

export const Content: React.FC<ContentProps> = memo(
  function Content({
    contentIdbKey,
    scheduleData,
    template,
    isSelected,
    onSelectChange,
    publishDateTime,
    onPublishDateTimeChange,
    caption,
    onCaptionChange,
  }: ContentProps) {
    const { isJobPending } = useDesignGenQueue();

    const handleDateTimeChange = useCallback(
      (value: { date: Date; hasTime: boolean; error?: string }) => {
        onPublishDateTimeChange({
          date: value.date,
          error: value.error,
        });
      },
      [onPublishDateTimeChange],
    );

    const renderContent = () => {
      switch (template.content_type) {
        case ContentType.InstagramPost:
        case ContentType.InstagramStory:
          return (
            <InstagramContent
              key={contentIdbKey}
              contentIdbKey={contentIdbKey}
              scheduleData={scheduleData}
              template={template}
              caption={caption}
              onCaptionChange={onCaptionChange}
            />
          );
        default:
          return <></>;
      }
    };

    const designLoading = isJobPending(contentIdbKey);
    return (
      <div className="m-1 flex w-full flex-col gap-2 sm:w-fit">
        <div className="ml-1 flex items-center gap-2">
          <Checkbox
            disabled={designLoading || !!publishDateTime.error}
            checked={!!publishDateTime.error ? false : isSelected}
            onCheckedChange={(checked: boolean) => onSelectChange(checked)}
          />
          <Tooltip>
            <TooltipTrigger asChild className="w-full">
              <DateTimePicker
                isDisabled={designLoading}
                value={{
                  date: publishDateTime.date,
                  hasTime: true,
                }}
                onChange={handleDateTimeChange}
                className={cn(
                  "h-[32px] w-full min-w-0 rounded-md px-3",
                  publishDateTime.error && "border-2 border-red-500",
                )}
                disablePastDateTime
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
          className={cn(isSelected && "rounded-md")}
          style={{
            boxShadow: isSelected ? "0 0 0 2px #4CAF50" : "none" /* emulate the border */,
          }}
        >
          {renderContent()}
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.contentIdbKey === nextProps.contentIdbKey &&
      prevProps.isSelected === nextProps.isSelected &&
      _.isEqual(prevProps.publishDateTime, nextProps.publishDateTime) &&
      _.isEqual(prevProps.scheduleData, nextProps.scheduleData) &&
      prevProps.caption === nextProps.caption
    );
  },
);
