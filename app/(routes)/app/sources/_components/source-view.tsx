"use client";

import { Spinner } from "@/src/components/common/loading-spinner";
import Tab from "@/src/components/ui/tab";
import { SourceDataView, SourceTypes } from "@/src/consts/sources";
import { getScheduleDataForSource } from "@/src/data/sources";
import { useSupaQuery } from "@/src/hooks/use-supabase";
import { Tables } from "@/types/db";
import dynamic from "next/dynamic";
import { useState } from "react";
import SourceViewDrive from "./source-view-drive";

const ReactJson = dynamic(() => import("react-json-view"), { ssr: false });

export default function SourceView({ selectedSource }: { selectedSource: Tables<"sources"> }) {
  const [selectedView, setSelectedView] = useState<SourceDataView>(SourceDataView.Daily);

  const {
    data: scheduleData,
    isLoading: isLoadingScheduleData,
    isRefetching,
  } = useSupaQuery(getScheduleDataForSource, {
    queryKey: ["getScheduleDataForSource", selectedSource.id, selectedView],
    arg: {
      id: selectedSource?.id,
      view: selectedView,
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
    if (isLoadingScheduleData || isRefetching) {
      return <Spinner className="mt-4" />;
    }
    switch (selectedSource.type) {
      case SourceTypes.GoogleDrive:
        return (
          <div className="flex-1 overflow-scroll">
            <SourceViewDrive source={selectedSource} />
          </div>
        );
      default:
        return (
          <div className="flex-1 overflow-scroll">
            <ReactJson
              src={scheduleData || {}}
              shouldCollapse={(field) => (field.name ? field.name.startsWith("schedules") : false)}
              displayDataTypes={false}
              name={false}
              theme={"chalk"}
              style={{
                padding: 16,
                borderRadius: 8,
              }}
            />
          </div>
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
