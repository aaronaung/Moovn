import { DesignContainer } from "@/src/components/common/design-container";
import { InstagramIcon } from "@/src/components/ui/icons/instagram";
import { renderCaption } from "@/src/libs/content";
import { ScheduleData } from "@/src/libs/sources/common";
import { cn } from "@/src/utils";
import { Tables } from "@/types/db";
import _ from "lodash";
import { memo } from "react";

export default memo(
  function InstagramContent({
    designPath,
    template,
    scheduleData,
  }: {
    designPath: string;
    template: Tables<"templates">;
    scheduleData: ScheduleData;
  }) {
    return (
      <div className="w-fit rounded-md bg-secondary" key={designPath}>
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
          <DesignContainer
            designPath={designPath}
            scheduleData={scheduleData}
            template={template}
          />
        </div>
        {!_.isEmpty(scheduleData) && template.ig_caption_template && (
          <div className="overflow-scroll p-2">
            <p className="overflow-scroll whitespace-pre-wrap text-sm">
              {renderCaption(template.ig_caption_template || "", scheduleData as any)}
            </p>
          </div>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    return _.isEqual(prevProps, nextProps);
  },
);
