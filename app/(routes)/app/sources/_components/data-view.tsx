import { Spinner } from "@/src/components/common/loading-spinner";
import Tab from "@/src/components/ui/tab";
import { SourceDataView } from "@/src/consts/sources";
import { getScheduleDataForSource } from "@/src/data/sources";
import { useSupaQuery } from "@/src/hooks/use-supabase";
import { transformSchedule } from "@/src/libs/sources/utils";
import { Tables } from "@/types/db";
import { useState } from "react";
import ReactJson from "react-json-view";

export default function DataView({
  selectedSource,
}: {
  selectedSource: Tables<"sources">;
}) {
  const [selectedView, setSelectedView] = useState<SourceDataView>(
    SourceDataView.DAILY,
  );
  const { data: scheduleData, isLoading: isLoadingScheduleData } = useSupaQuery(
    getScheduleDataForSource,
    {
      queryKey: ["getScheduleDataForSource", selectedSource.id, selectedView],
      arg: {
        id: selectedSource?.id,
        view: selectedView,
      },
      enabled: !!selectedSource,
    },
  );

  const handleTabSelect = (tab: SourceDataView) => {
    setSelectedView(tab);
  };

  const renderDataView = () => {
    if (!selectedSource) {
      return (
        <p className="text-sm text-muted-foreground">
          Please select a source first.
        </p>
      );
    }
    if (isLoadingScheduleData) {
      return <Spinner className="mt-4" />;
    }

    const transformedSchedule = transformSchedule(scheduleData);
    return (
      <div className="flex-1 overflow-scroll">
        <ReactJson
          src={transformedSchedule}
          shouldCollapse={(field) =>
            field.name ? field.name.startsWith("schedules") : false
          }
          displayDataTypes={false}
          name={false}
        />
      </div>
    );
  };

  return (
    <>
      {selectedSource && (
        <div className="my-2 flex gap-x-2">
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
      {renderDataView()}
    </>
  );
}
