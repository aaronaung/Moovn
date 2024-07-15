import { Spinner } from "@/src/components/common/loading-spinner";
import Tab from "@/src/components/ui/tab";
import { SourceDataView } from "@/src/consts/sources";
import { getScheduleDataForSource } from "@/src/data/sources";
import { useSupaQuery } from "@/src/hooks/use-supabase";
import { Tables } from "@/types/db";
import dynamic from "next/dynamic";
import { useState } from "react";

const ReactJson = dynamic(() => import("react-json-view"), { ssr: false });

export default function DataView({ selectedSource }: { selectedSource: Tables<"sources"> }) {
  const [selectedView, setSelectedView] = useState<SourceDataView>(SourceDataView.DAILY);
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
      return <p className="text-sm text-muted-foreground">Please select a source first.</p>;
    }
    if (isLoadingScheduleData) {
      return <Spinner className="mt-4" />;
    }

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
  };

  return (
    <>
      {selectedSource && (
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
      {renderDataView()}
    </>
  );
}
