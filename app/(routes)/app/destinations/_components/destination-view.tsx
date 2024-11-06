import { Tables } from "@/types/db";
import { useSupaQuery } from "@/src/hooks/use-supabase";
import { getContentSchedulesForDestination } from "@/src/data/destinations";
import ContentSchedulesTable from "@/src/components/tables/content-schedules";
import { Header2 } from "@/src/components/common/header";
import { Spinner } from "@/src/components/common/loading-spinner";

import { RotateCw } from "lucide-react";
import { cn } from "@/src/utils";
import { Button } from "@/src/components/ui/button";

export default function DestinationView({ destination }: { destination: Tables<"destinations"> }) {
  const {
    data: schedules,
    isLoading,
    refetch,
    isRefetching,
  } = useSupaQuery(getContentSchedulesForDestination, {
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
        <div className="flex justify-end gap-2">
          <Button
            onClick={() => refetch()}
            disabled={isRefetching}
            variant="outline"
            className="gap-2"
          >
            <RotateCw className={cn("h-4 w-4", isRefetching && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>
      {isLoading ? (
        <Spinner />
      ) : (
        <div className="flex-1  overflow-auto">
          <ContentSchedulesTable data={schedules ?? []} />
        </div>
      )}
    </div>
  );
}
