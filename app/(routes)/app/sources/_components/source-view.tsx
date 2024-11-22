"use client";

import { Spinner } from "@/src/components/common/loading-spinner";
import Tab from "@/src/components/ui/tab";
import { SourceDataView, SourceTypes } from "@/src/consts/sources";
import { getScheduleDataForSource } from "@/src/data/sources";
import { useSupaQuery } from "@/src/hooks/use-supabase";
import { Tables } from "@/types/db";
import { useState } from "react";
import SourceViewDrive from "./source-view-drive";
import SourceViewSchedule from "./source-view-schedule";

export default function SourceView({ selectedSource }: { selectedSource: Tables<"sources"> }) {
  const [selectedView, setSelectedView] = useState<SourceDataView>(SourceDataView.Daily);

  const {
    data: scheduleData,
    isLoading: isLoadingScheduleData,
    isRefetching,
    refetch,
  } = useSupaQuery(getScheduleDataForSource, {
    queryKey: ["getScheduleDataForSource", selectedSource.id, selectedView],
    arg: {
      id: selectedSource?.id,
      view: selectedView,
      flatten: false,
    },
    enabled: !!selectedSource && selectedSource.type !== SourceTypes.GoogleDrive,
    refetchOnWindowFocus: false,
  });

  const handleTabSelect = (tab: SourceDataView) => {
    setSelectedView(tab);
  };

  const renderSourceView = () => {
    if (!selectedSource) {
      return <p className="text-sm text-muted-foreground">Please select a source first.</p>;
    }
    if (isLoadingScheduleData) {
      return <Spinner className="mt-4" />;
    }
    console.log({ scheduleData });
    switch (selectedSource.type) {
      case SourceTypes.GoogleDrive:
        return <SourceViewDrive source={selectedSource} />;

      default:
        return (
          <SourceViewSchedule
            scheduleData={scheduleData as any}
            isRefetching={isRefetching}
            onRefresh={() => refetch()}
          />
        );
    }
  };

  return (
    <>
      {selectedSource && selectedSource.type !== SourceTypes.GoogleDrive && (
        <div className="mb-2 flex gap-x-2">
          {Object.values(SourceDataView).map((tab) => {
            return (
              <Tab
                key={tab}
                type={tab as SourceDataView}
                selected={selectedView}
                onSelect={() => {
                  handleTabSelect(tab as SourceDataView);
                }}
              />
            );
          })}
        </div>
      )}
      {renderSourceView()}
    </>
  );
}
