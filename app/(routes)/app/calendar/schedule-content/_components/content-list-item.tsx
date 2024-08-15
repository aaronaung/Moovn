import { ContentType } from "@/src/consts/content";
import { ScheduleData } from "@/src/libs/sources/common";
import { Tables } from "@/types/db";
import InstagramContent from "./instagram-content";
import { Checkbox } from "@/src/components/ui/checkbox";
import { DateTimePicker } from "@/src/components/ui/date-time-picker";

export default function ContentListItem({
  idbKey,
  scheduleData,
  template,
  isSelected,
  onSelectChange,
  publishDateTime,
  onPublishDateTimeChange,
}: {
  idbKey: string;
  scheduleData: ScheduleData;
  template: Tables<"templates">;
  isSelected: boolean;
  onSelectChange: (selected: boolean) => void;
  publishDateTime: Date;
  onPublishDateTimeChange: (dateTime: Date) => void;
}) {
  console.log({ idbKey });
  const renderContent = () => {
    let contentComp = <></>;
    switch (template.content_type) {
      case ContentType.InstagramPost:
      case ContentType.InstagramStory:
        contentComp = (
          <InstagramContent
            key={idbKey}
            designIdbKey={idbKey}
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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-center gap-2">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked: boolean) => onSelectChange(checked)}
        />
        <DateTimePicker
          value={{
            date: publishDateTime || new Date(idbKey.split(" - ")[0]),
            hasTime: true,
          }}
          className="h-[32px] w-[185px] min-w-0 px-3"
          onChange={(dateTime) => {
            onPublishDateTimeChange(dateTime.date);
          }}
        />
      </div>
      {renderContent()}
    </div>
  );
}
