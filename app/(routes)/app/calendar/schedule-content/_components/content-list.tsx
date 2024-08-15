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
    <div>
      <p className="mb-6 mt-2 text-sm text-muted-foreground">
        If you think the design is incorrect, you can refresh or edit it.
      </p>
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
