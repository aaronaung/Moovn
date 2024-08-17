import { Spinner } from "@/src/components/common/loading-spinner";
import { getScheduleDataForSourceByTimeRange } from "@/src/data/sources";
import { getTemplatesByIds } from "@/src/data/templates";
import { useSupaQuery } from "@/src/hooks/use-supabase";
import { organizeScheduleDataByView } from "@/src/libs/sources/utils";
import { Dispatch, SetStateAction, useMemo, useState } from "react";
import { cn } from "@/src/utils";
import { SIDEBAR_WIDTH } from "../../../_components/dashboard-layout";
import { DESIGN_WIDTH } from "@/src/components/common/design-container";
import { isMobile } from "react-device-detect";
import ContentListItem from "./content-list-item";
import { ScheduleData } from "@/src/libs/sources/common";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Label } from "@/src/components/ui/label";
import { Button } from "@/src/components/ui/button";
import { SourceDataView } from "@/src/consts/sources";
import { TimePicker } from "@/src/components/ui/time-picker";
import { startOfDay } from "date-fns";
import { Tables } from "@/types/db";
import { getDesignPath } from "@/src/libs/designs/util";

export default function ContentList({
  sourceId,
  templateIds,
  scheduleRange,
}: {
  sourceId: string;
  templateIds: string[];
  scheduleRange: {
    from: Date;
    to: Date;
  };
}) {
  const [selectedContentItems, setSelectedContentItems] = useState<string[]>([]);
  const [publishDateTimeMap, setPublishDateTimeMap] = useState<{ [key: string]: Date }>({});

  const { data: templates, isLoading: isLoadingTemplates } = useSupaQuery(getTemplatesByIds, {
    queryKey: ["getTemplatesByIds", templateIds],
    arg: templateIds,
  });
  const { data: scheduleData, isLoading: isLoadingScheduleData } = useSupaQuery(
    getScheduleDataForSourceByTimeRange,
    {
      queryKey: ["getScheduleDataForSourceByTimeRange", sourceId, scheduleRange],
      arg: {
        id: sourceId,
        dateRange: scheduleRange,
      },
    },
  );

  if (isLoadingScheduleData || isLoadingTemplates || !templates || !scheduleData) {
    return <Spinner className="mt-8" />;
  }

  return (
    <div className="mb-8">
      <div className="flex">
        <p className="mb-4 mt-1 flex-1 text-sm text-muted-foreground">
          Schedule one or more generated designs for publication on any desired date. If a design is
          incorrect, you can refresh or edit it.
        </p>
        <div
          className={cn(
            "fixed right-4 z-10 rounded-md  p-2 md:right-12 md:top-6 md:p-4",
            isMobile && "bottom-4",
            selectedContentItems.length > 0 && "bg-secondary",
          )}
        >
          <div className="flex items-center gap-1 self-end">
            {selectedContentItems.length > 0 && (
              <p className="flex h-14 items-center px-4 text-sm text-secondary-foreground">
                {selectedContentItems.length} selected
              </p>
            )}
            <Button size={"lg"} disabled={selectedContentItems.length === 0} className="h-14">
              Schedule for publishing
            </Button>
          </div>
        </div>
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

  const scheduleDataByView = useMemo(
    () => organizeScheduleDataByView(template?.source_data_view!, scheduleRange, scheduleData!),
    [template?.source_data_view!, scheduleData, scheduleRange],
  );
  const carouselCount = (window.innerWidth - SIDEBAR_WIDTH - 150) / DESIGN_WIDTH;
  const showCarousel = Object.keys(scheduleDataByView).length >= carouselCount && !isMobile;

  const renderContentListItem = (designPath: string, schedule: ScheduleData) => {
    return (
      <ContentListItem
        key={designPath}
        designPath={designPath}
        template={template}
        scheduleData={schedule}
        publishDateTime={publishDateTimeMap[designPath]}
        onPublishDateTimeChange={(publishDateTime) => {
          setPublishDateTimeMap((prev) => ({
            ...prev,
            [designPath]: publishDateTime,
          }));
        }}
        isSelected={selectedContentItems.includes(designPath)}
        onSelectChange={(isSelected) => {
          setSelectedContentItems((prev) =>
            isSelected ? [...prev, designPath] : prev.filter((item) => item !== designPath),
          );
        }}
      />
    );
  };

  return (
    <div className="flex w-full flex-col">
      <div className="mb-2 flex min-h-[40px] flex-wrap items-center gap-3 rounded-md p-2">
        <p className="flex-1 font-semibold">{template.name}</p>
        <div className="flex min-h-[40px] items-center gap-2 rounded-md bg-secondary px-4">
          <Checkbox
            id={`select-all-${template.id}`}
            checked={Object.keys(scheduleDataByView)
              .map((scheduleRange) => getDesignPath(scheduleRange, template.id))
              .every((designPath) => selectedContentItems.includes(designPath))}
            onCheckedChange={(checked: boolean) => {
              if (checked) {
                setSelectedContentItems((prev) => [
                  ...prev,
                  ...Object.keys(scheduleDataByView)
                    .map((scheduleRange) => getDesignPath(scheduleRange, template.id))
                    .filter((designPath) => !prev.includes(designPath)),
                ]);
              } else {
                setSelectedContentItems((prev) =>
                  prev.filter(
                    (designPath) =>
                      !Object.keys(scheduleDataByView)
                        .map((scheduleRange) => getDesignPath(scheduleRange, template.id))
                        .includes(designPath),
                  ),
                );
              }
            }}
          />
          <Label htmlFor={`select-all-${template.id}`}>Select all</Label>
        </div>
        {template.source_data_view === SourceDataView.Daily && (
          <div className="flex min-h-[40px] items-center gap-2 rounded-md bg-secondary px-4">
            <Label htmlFor="publish-date shrink-0">Set schedule time for all</Label>
            <TimePicker
              date={timeForAll ?? startOfDay(new Date())}
              setDate={(date) => {
                setTimeForAll(date ?? new Date());
                Object.keys(scheduleDataByView).forEach((scheduleRange) => {
                  setPublishDateTimeMap((prev) => ({
                    ...prev,
                    [getDesignPath(scheduleRange, template.id)]: date ?? startOfDay(new Date()),
                  }));
                });
              }}
            />
          </div>
        )}
      </div>
      <div className={cn("flex flex-wrap gap-3 overflow-scroll")}>
        {Object.entries(scheduleDataByView).map(([scheduleRange, schedule]) =>
          renderContentListItem(getDesignPath(scheduleRange, template.id), schedule),
        )}
      </div>
    </div>
  );
};
