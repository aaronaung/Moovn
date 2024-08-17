import { ContentType } from "@/src/consts/content";
import { ScheduleData } from "@/src/libs/sources/common";
import { Tables } from "@/types/db";
import InstagramContent from "./instagram-content";
import { Checkbox } from "@/src/components/ui/checkbox";
import { DateTimePicker } from "@/src/components/ui/date-time-picker";
import { cn } from "@/src/utils";
import { memo } from "react";
import { parse } from "date-fns";

export default memo(
  function ContentListItem({
    designPath,
    scheduleData,
    template,
    isSelected,
    onSelectChange,
    publishDateTime,
    onPublishDateTimeChange,
  }: {
    designPath: string;
    scheduleData: ScheduleData;
    template: Tables<"templates">;
    isSelected: boolean;
    onSelectChange: (selected: boolean) => void;
    publishDateTime: Date;
    onPublishDateTimeChange: (dateTime: Date) => void;
  }) {
    const renderContent = () => {
      let contentComp = <></>;
      switch (template.content_type) {
        case ContentType.InstagramPost:
        case ContentType.InstagramStory:
          contentComp = (
            <InstagramContent
              key={designPath}
              designPath={designPath}
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

    const date = parse(designPath.split("/")[0].split(" - ")[0], "yyyy-MM-dd", new Date());
    console.log({
      date,
      designPath,
    });

    return (
      <div className={cn("flex flex-col gap-2")}>
        <div className="ml-1 flex items-center gap-2">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked: boolean) => onSelectChange(checked)}
          />
          <DateTimePicker
            value={{
              date: publishDateTime || date,
              hasTime: true,
            }}
            className="h-[32px] w-[185px] min-w-0 px-3"
            onChange={(dateTime) => {
              onPublishDateTimeChange(dateTime.date);
            }}
          />
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
      prev.designPath === next.designPath &&
      prev.isSelected === next.isSelected &&
      prev.publishDateTime === next.publishDateTime &&
      prev.scheduleData === next.scheduleData
    );
  },
);
