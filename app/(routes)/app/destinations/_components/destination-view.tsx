import { Tables } from "@/types/db";
import { useSupaQuery } from "@/src/hooks/use-supabase";
import { getContentSchedulesForDestination } from "@/src/data/destinations";
import ContentSchedulesTable from "@/src/components/tables/content-schedules";
import { Header2 } from "@/src/components/common/header";
import { Spinner } from "@/src/components/common/loading-spinner";

export default function DestinationView({ destination }: { destination: Tables<"destinations"> }) {
  const { data: schedules, isLoading } = useSupaQuery(getContentSchedulesForDestination, {
    arg: destination.id,
    queryKey: ["getContentSchedulesForDestination", destination.id],
  });

  return (
    <div className="flex h-full flex-col space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <Header2 className="flex-1" title="Schedule History" />
          <p className="text-sm text-muted-foreground">
            View all scheduled and published content for this destination.
          </p>
        </div>
      </div>
      {isLoading ? (
        <Spinner />
      ) : (
        <div className="flex-1 overflow-auto">
          {schedules && schedules.length > 0 ? (
            <ContentSchedulesTable data={schedules} />
          ) : (
            <p className="text-sm text-muted-foreground">
              No schedules found for this destination.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
