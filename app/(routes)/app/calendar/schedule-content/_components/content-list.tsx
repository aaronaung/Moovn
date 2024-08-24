import { Spinner } from "@/src/components/common/loading-spinner";
import { getTemplatesByIds } from "@/src/data/templates";
import { useSupaQuery } from "@/src/hooks/use-supabase";
import { organizeScheduleDataByView } from "@/src/libs/sources/utils";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { cn } from "@/src/utils";
import { SIDEBAR_WIDTH } from "../../../_components/dashboard-layout";
import { DESIGN_WIDTH } from "@/app/(routes)/app/calendar/schedule-content/_components/design-container";
import { isMobile } from "react-device-detect";
import ContentListItem from "./content-list-item";
import { ScheduleData } from "@/src/libs/sources/common";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Label } from "@/src/components/ui/label";
import { TimePicker } from "@/src/components/ui/time-picker";
import { parse, startOfDay } from "date-fns";
import { Tables } from "@/types/db";
import { getContentPath } from "@/src/libs/content";
import _ from "lodash";

export default function ContentList({
  templateIds,
  scheduleRange,
  scheduleData,
  selectedContentItems,
  setSelectedContentItems,
  publishDateTimeMap,
  setPublishDateTimeMap,
}: {
  templateIds: string[];
  scheduleRange: {
    from: Date;
    to: Date;
  };
  scheduleData: ScheduleData;
  selectedContentItems: string[];
  setSelectedContentItems: Dispatch<SetStateAction<string[]>>;
  publishDateTimeMap: { [key: string]: Date };
  setPublishDateTimeMap: Dispatch<SetStateAction<{ [key: string]: Date }>>;
}) {
  const { data: templates, isLoading: isLoadingTemplates } = useSupaQuery(getTemplatesByIds, {
    queryKey: ["getTemplatesByIds", templateIds],
    arg: templateIds,
  });

  if (isLoadingTemplates || !templates) {
    return <Spinner className="mt-8" />;
  }

  return (
    <div className="relative mb-8">
      <div className="flex">
        <p className="mb-4 mt-1 flex-1 text-sm text-muted-foreground">
          Schedule one or more generated designs for publication on any desired date. If a design is
          incorrect, you can refresh or edit it.
        </p>
      </div>
      {templates.map((template, index) => (
        <div key={template.id}>
          <ContentListForTemplate
            template={template}
            scheduleRange={scheduleRange}
            scheduleData={scheduleData}
            selectedContentItems={selectedContentItems}
            setSelectedContentItems={setSelectedContentItems}
            publishDateTimeMap={publishDateTimeMap}
            setPublishDateTimeMap={setPublishDateTimeMap}
          />
          {index !== templates.length - 1 && (
            <hr className="mb-2 mt-4 rounded-full border-2 border-muted" />
          )}
        </div>
      ))}
    </div>
  );
}

const ContentListForTemplate = ({
  template,
  scheduleRange,
  scheduleData,
  selectedContentItems,
  setSelectedContentItems,
  publishDateTimeMap,
  setPublishDateTimeMap,
}: {
  template: Tables<"templates">;
  scheduleRange: {
    from: Date;
    to: Date;
  };
  scheduleData: ScheduleData;
  selectedContentItems: string[];
  setSelectedContentItems: Dispatch<SetStateAction<string[]>>;
  publishDateTimeMap: { [key: string]: Date };
  setPublishDateTimeMap: Dispatch<SetStateAction<{ [key: string]: Date }>>;
}) => {
  const [timeForAll, setTimeForAll] = useState<Date | null>(null);

  const scheduleDataByRange = useMemo(
    () => organizeScheduleDataByView(template?.source_data_view!, scheduleRange, scheduleData!),
    [template?.source_data_view!, scheduleData, scheduleRange],
  );

  useEffect(() => {
    for (const range in scheduleDataByRange) {
      const date = parse(range.split(" - ")[0], "yyyy-MM-dd", new Date());
      setPublishDateTimeMap((prev) => {
        const contentPath = getContentPath(range, template);
        return {
          ...prev,
          [contentPath]: date,
        };
      });
    }
  }, []);

  const carouselCount = (window.innerWidth - SIDEBAR_WIDTH - 150) / DESIGN_WIDTH;
  const showCarousel = Object.keys(scheduleDataByRange).length >= carouselCount && !isMobile;

  const renderContentListItem = (contentPath: string, schedule: ScheduleData) => {
    return (
      <ContentListItem
        key={contentPath}
        contentPath={contentPath}
        template={template}
        scheduleData={schedule}
        publishDateTime={publishDateTimeMap[contentPath]}
        onPublishDateTimeChange={(publishDateTime) => {
          setPublishDateTimeMap((prev) => ({
            ...prev,
            [contentPath]: publishDateTime,
          }));
        }}
        isSelected={selectedContentItems.includes(contentPath)}
        onSelectChange={(isSelected) => {
          setSelectedContentItems((prev) =>
            isSelected ? [...prev, contentPath] : prev.filter((item) => item !== contentPath),
          );
        }}
      />
    );
  };

  return (
    <div className="flex w-full flex-col">
      <div className="mb-2 flex min-h-[40px] flex-wrap items-center gap-3 rounded-md p-2">
        <div className="flex flex-1 items-center gap-2">
          <p className="font-semibold">{template.name}</p>
          <p className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">
            {template.source_data_view} schedule
          </p>
        </div>
        {!_.isEmpty(scheduleDataByRange) && (
          <>
            <div className="flex min-h-[40px] items-center gap-2 rounded-md bg-secondary px-4">
              <Checkbox
                id={`select-all-${template.id}`}
                checked={Object.keys(scheduleDataByRange)
                  .map((scheduleRange) => getContentPath(scheduleRange, template))
                  .every((contentPath) => selectedContentItems.includes(contentPath))}
                onCheckedChange={(checked: boolean) => {
                  const contentPaths = Object.keys(scheduleDataByRange).map((scheduleRange) =>
                    getContentPath(scheduleRange, template),
                  );
                  if (checked) {
                    setSelectedContentItems((prev) => [
                      ...prev,
                      ...contentPaths.filter((contentPath) => !prev.includes(contentPath)),
                    ]);
                  } else {
                    setSelectedContentItems((prev) =>
                      prev.filter((contentPath) => !contentPaths.includes(contentPath)),
                    );
                  }
                }}
              />
              <Label htmlFor={`select-all-${template.id}`}>Select all</Label>
            </div>
            <div className="flex min-h-[40px] items-center gap-2 rounded-md bg-secondary px-4">
              <Label htmlFor="publish-date shrink-0">Set publish time for all</Label>
              <TimePicker
                hideSeconds
                date={timeForAll ?? startOfDay(new Date())}
                setDate={(date) => {
                  const d = date ?? new Date();
                  setTimeForAll(d);
                  Object.keys(scheduleDataByRange).forEach((scheduleRange) => {
                    setPublishDateTimeMap((prev) => {
                      const contentPath = getContentPath(scheduleRange, template);
                      const prevDate = prev[contentPath];
                      const newDate = new Date(d.getTime());
                      newDate.setDate(prevDate.getDate());
                      newDate.setMonth(prevDate.getMonth());
                      newDate.setFullYear(prevDate.getFullYear());

                      return {
                        ...prev,
                        [contentPath]: newDate,
                      };
                    });
                  });
                }}
              />
            </div>
          </>
        )}
      </div>
      {_.isEmpty(scheduleDataByRange) && (
        <p className="text-sm text-muted-foreground">
          The schedule data is empty for the selected date range.
        </p>
      )}
      {!_.isEmpty(scheduleDataByRange) && (
        <div className={cn("flex flex-wrap gap-3 overflow-scroll")}>
          {Object.entries(scheduleDataByRange).map(([scheduleRange, schedule]) =>
            renderContentListItem(getContentPath(scheduleRange, template), schedule),
          )}
        </div>
      )}
    </div>
  );
};
