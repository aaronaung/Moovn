import { Spinner } from "@/src/components/common/loading-spinner";
import { getTemplatesByIds } from "@/src/data/templates";
import { useSupaQuery } from "@/src/hooks/use-supabase";
import { organizeScheduleDataByView } from "@/src/libs/sources/utils";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { cn } from "@/src/utils";
import { Content } from "./content";
import { ScheduleData } from "@/src/libs/sources";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Label } from "@/src/components/ui/label";
import { TimePicker } from "@/src/components/ui/time-picker";
import { addHours, isSameDay, startOfDay, startOfHour } from "date-fns";
import { Tables } from "@/types/db";
import { getContentIdbKey, getRangeStart } from "@/src/libs/content";
import _ from "lodash";

export default function ContentList({
  sourceId,
  templateIds,
  scheduleRange,
  scheduleData,
  selectedContentItems,
  setSelectedContentItems,
  publishDateTimeMap,
  setPublishDateTimeMap,
  captionMap,
  setCaptionMap,
}: {
  sourceId: string;
  templateIds: string[];
  scheduleRange: {
    from: Date;
    to: Date;
  };
  scheduleData: ScheduleData;
  selectedContentItems: string[];
  setSelectedContentItems: Dispatch<SetStateAction<string[]>>;
  publishDateTimeMap: { [key: string]: { date: Date; error: string | undefined } };
  setPublishDateTimeMap: Dispatch<
    SetStateAction<{ [key: string]: { date: Date; error: string | undefined } }>
  >;
  captionMap: { [key: string]: string };
  setCaptionMap: Dispatch<SetStateAction<{ [key: string]: string }>>;
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
      {scheduleData["day#1.siteTimeZone"] && (
        <p className="mt-2 flex-1 text-sm">
          The selected source operates in <b>{scheduleData["day#1.siteTimeZone"]}</b> timezone.
        </p>
      )}
      <div className="flex">
        <p className="mb-4 mt-1 hidden flex-1 text-xs text-muted-foreground lg:block">
          Schedule one or more generated designs for publication on any desired date. If a design is
          incorrect, you can refresh or edit it.
        </p>
      </div>
      {templates.map((template, index) => (
        <div key={template.id}>
          <ContentListForTemplate
            sourceId={sourceId}
            template={template}
            scheduleRange={scheduleRange}
            scheduleData={scheduleData}
            selectedContentItems={selectedContentItems}
            setSelectedContentItems={setSelectedContentItems}
            publishDateTimeMap={publishDateTimeMap}
            setPublishDateTimeMap={setPublishDateTimeMap}
            captionMap={captionMap}
            setCaptionMap={setCaptionMap}
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
  sourceId,
  template,
  scheduleRange,
  scheduleData,
  selectedContentItems,
  setSelectedContentItems,
  publishDateTimeMap,
  setPublishDateTimeMap,
  captionMap,
  setCaptionMap,
}: {
  sourceId: string;
  template: Tables<"templates">;
  scheduleRange: {
    from: Date;
    to: Date;
  };
  scheduleData: ScheduleData;
  selectedContentItems: string[];
  setSelectedContentItems: Dispatch<SetStateAction<string[]>>;
  publishDateTimeMap: { [key: string]: { date: Date; error: string | undefined } };
  setPublishDateTimeMap: Dispatch<
    SetStateAction<{ [key: string]: { date: Date; error: string | undefined } }>
  >;
  captionMap: { [key: string]: string };
  setCaptionMap: Dispatch<SetStateAction<{ [key: string]: string }>>;
}) => {
  const [timeForAll, setTimeForAll] = useState<Date | null>(null);
  const [scheduleDataByRange, setScheduleDataByRange] = useState<ScheduleData>();

  useEffect(() => {
    const scheduleByRange = organizeScheduleDataByView(
      template.source_data_view,
      scheduleData!,
      scheduleRange,
    );

    setScheduleDataByRange(scheduleByRange);
    for (const range in scheduleByRange) {
      const date = getRangeStart(range);
      setPublishDateTimeMap((prev) => {
        const contentIdbKey = getContentIdbKey(sourceId, range, template);
        return {
          ...prev,
          [contentIdbKey]: {
            date: isSameDay(date, new Date()) ? startOfHour(addHours(new Date(), 1)) : date,
            error: undefined,
          },
        };
      });
    }
  }, []);

  const renderContent = (contentIdbKey: string, schedule: ScheduleData) => {
    return (
      <Content
        key={contentIdbKey}
        contentIdbKey={contentIdbKey}
        template={template}
        scheduleData={schedule}
        publishDateTime={
          publishDateTimeMap[contentIdbKey] ?? { date: new Date(), error: undefined }
        }
        onPublishDateTimeChange={(publishDateTime) => {
          setPublishDateTimeMap((prev) => ({
            ...prev,
            [contentIdbKey]: publishDateTime,
          }));
        }}
        caption={captionMap[contentIdbKey]}
        onCaptionChange={(caption) => {
          setCaptionMap((prev) => ({
            ...prev,
            [contentIdbKey]: caption,
          }));
        }}
        isSelected={selectedContentItems.includes(contentIdbKey)}
        onSelectChange={(isSelected) => {
          setSelectedContentItems((prev) =>
            isSelected ? [...prev, contentIdbKey] : prev.filter((item) => item !== contentIdbKey),
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
        </div>
        {!_.isEmpty(scheduleDataByRange) && (
          <>
            <div className="flex min-h-[40px] items-center gap-2 rounded-md bg-secondary px-4">
              <Checkbox
                id={`select-all-${template.id}`}
                checked={Object.keys(scheduleDataByRange)
                  .map((scheduleRange) => getContentIdbKey(sourceId, scheduleRange, template))
                  .every((contentIdbKey) => selectedContentItems.includes(contentIdbKey))}
                onCheckedChange={(checked: boolean) => {
                  const contentIdbKeys = Object.keys(scheduleDataByRange).map((scheduleRange) =>
                    getContentIdbKey(sourceId, scheduleRange, template),
                  );
                  if (checked) {
                    setSelectedContentItems((prev) => [
                      ...prev,
                      ...contentIdbKeys.filter((contentIdbKey) => !prev.includes(contentIdbKey)),
                    ]);
                  } else {
                    setSelectedContentItems((prev) =>
                      prev.filter((contentIdbKey) => !contentIdbKeys.includes(contentIdbKey)),
                    );
                  }
                }}
              />
              <Label htmlFor={`select-all-${template.id}`}>Select all</Label>
            </div>
            <div className="flex min-h-[40px] w-full items-center justify-center gap-2 rounded-md bg-secondary px-4 sm:w-fit">
              <Label htmlFor="publish-date shrink-0">Publish time for all</Label>
              <TimePicker
                hideSeconds
                date={timeForAll ?? startOfDay(new Date())}
                setDate={(date) => {
                  const d = date ?? new Date();
                  setTimeForAll(d);
                  Object.keys(scheduleDataByRange).forEach((scheduleRange) => {
                    setPublishDateTimeMap((prev) => {
                      const contentIdbKey = getContentIdbKey(sourceId, scheduleRange, template);
                      const prevDate = prev[contentIdbKey].date;

                      const newDate = new Date(d.getTime());
                      newDate.setDate(prevDate.getDate());
                      newDate.setMonth(prevDate.getMonth());
                      newDate.setFullYear(prevDate.getFullYear());

                      let dateErr = prev[contentIdbKey].error;
                      if (newDate.getTime() < Date.now()) {
                        dateErr = "Selected datetime must be in the future";
                      }

                      return {
                        ...prev,
                        [contentIdbKey]: {
                          date: newDate,
                          error: dateErr,
                        },
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
            renderContent(getContentIdbKey(sourceId, scheduleRange, template), schedule),
          )}
        </div>
      )}
    </div>
  );
};
