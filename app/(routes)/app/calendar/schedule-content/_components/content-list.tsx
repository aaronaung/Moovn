import { Spinner } from "@/src/components/common/loading-spinner";
import { getScheduleDataForSourceByTimeRange } from "@/src/data/sources";
import { getTemplateById } from "@/src/data/templates";
import { useSupaQuery } from "@/src/hooks/use-supabase";
import { organizeScheduleDataByView } from "@/src/libs/sources/utils";
import { useMemo, useState } from "react";
import { cn } from "@/src/utils";
import { SIDEBAR_WIDTH } from "../../../_components/dashboard-layout";
import { DESIGN_WIDTH } from "@/src/components/common/design-container";
import { isMobile } from "react-device-detect";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/src/components/ui/carousel";
import ContentListItem from "./content-list-item";
import { ScheduleData } from "@/src/libs/sources/common";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Label } from "@/src/components/ui/label";
import { Button } from "@/src/components/ui/button";

export default function ContentList({
  sourceId,
  templateId,
  scheduleRange,
}: {
  sourceId: string;
  templateId: string;
  scheduleRange: {
    from: Date;
    to: Date;
  };
}) {
  const [selectedContentItems, setSelectedContentItems] = useState<string[]>([]);
  const [publishDateTimeMap, setPublishDateTimeMap] = useState<{ [key: string]: Date }>({});

  const { data: template, isLoading: isLoadingTemplate } = useSupaQuery(getTemplateById, {
    queryKey: ["getTemplateById", templateId],
    arg: templateId,
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
  const scheduleDataByView = useMemo(
    () => organizeScheduleDataByView(template?.source_data_view!, scheduleRange, scheduleData!),
    [template?.source_data_view!, scheduleData, scheduleRange],
  );

  if (isLoadingScheduleData || isLoadingTemplate || !template || !scheduleData) {
    return <Spinner className="mt-8" />;
  }

  const carouselCount = (window.innerWidth - SIDEBAR_WIDTH - 150) / DESIGN_WIDTH;
  const showCarousel = Object.keys(scheduleDataByView).length >= carouselCount && !isMobile;

  const renderContentListItem = (idbKey: string, schedule: ScheduleData) => (
    <ContentListItem
      key={idbKey}
      idbKey={idbKey}
      template={template}
      scheduleData={schedule}
      publishDateTime={publishDateTimeMap[idbKey]}
      onPublishDateTimeChange={(publishDateTime) => {
        setPublishDateTimeMap((prev) => ({
          ...prev,
          [idbKey]: publishDateTime,
        }));
      }}
      isSelected={selectedContentItems.includes(idbKey)}
      onSelectChange={(isSelected) => {
        setSelectedContentItems((prev) =>
          isSelected ? [...prev, idbKey] : prev.filter((item) => item !== idbKey),
        );
      }}
    />
  );

  return (
    <div className="w-full">
      <div className="flex">
        <p className="mb-4 mt-2 flex-1 text-sm text-muted-foreground">
          Schedule one or more generated designs for publication on any desired date. If a design is
          incorrect, you can refresh or edit it.
        </p>
        <div className="flex items-center gap-2 self-end">
          {selectedContentItems.length > 0 && (
            <p className="flex h-10 items-center rounded-full bg-secondary px-4 text-sm text-secondary-foreground">
              {selectedContentItems.length} selected
            </p>
          )}
          <Button disabled={selectedContentItems.length === 0} className="h-10">
            Schedule for publishing
          </Button>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Checkbox
            id="select-all"
            onCheckedChange={(checked: boolean) => {
              if (checked) {
                setSelectedContentItems(Object.keys(scheduleDataByView));
              } else {
                setSelectedContentItems([]);
              }
            }}
          />
          <Label htmlFor={"select-all"}>Select all</Label>
        </div>
      </div>
      <div
        className={cn("flex gap-3 overflow-scroll", showCarousel ? "justify-center" : "flex-wrap")}
      >
        {showCarousel ? (
          <Carousel className="w-[calc(100%_-_100px)]">
            <CarouselContent>
              {Object.entries(scheduleDataByView).map(([idbKey, schedule]) => (
                <CarouselItem className={`basis-[1/5]`} key={idbKey}>
                  {renderContentListItem(idbKey, schedule)}
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        ) : (
          Object.entries(scheduleDataByView).map(([idbKey, schedule]) =>
            renderContentListItem(idbKey, schedule),
          )
        )}
      </div>
    </div>
  );
}
