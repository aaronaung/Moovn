import { Spinner } from "@/src/components/common/loading-spinner";
import { useSupaQuery } from "@/src/hooks/use-supabase";
import { Tables } from "@/types/db";
import { Header2 } from "@/src/components/common/header";
import { getScheduleDataForSourceByTimeRange } from "@/src/data/sources";

export default function ContentList({
  sourceId,
  template,
  scheduleRange,
}: {
  sourceId: string;
  template: Tables<"templates">;
  scheduleRange: {
    from: Date;
    to: Date;
  };
}) {
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
  console.log(scheduleData);

  if (isLoadingScheduleData) {
    return <Spinner />;
  }

  const renderContent = (
    content: Tables<"content"> & { destination: Tables<"destinations"> | null },
  ) => {
    let contentComp = <></>;
    // switch (content.destination?.type) {
    //   case DestinationTypes.Instagram:
    //     contentComp = <InstagramContent key={content.id} content={content} />;
    //     break;
    //   default:
    //     return <></>;
    // }

    return contentComp;
  };

  return (
    <div>
      <div className="mb-3 flex items-end">
        <div className="flex-1">
          <Header2 title="Content" />
          <p className="text-sm text-muted-foreground">
            Content is auto-generated from a template and can be published to a destination. If you
            think an auto-generated design is incorrect, you can refresh the design or edit to
            overwrite it.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 overflow-scroll"></div>
    </div>
  );
}
