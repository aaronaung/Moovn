import { syncDriveSource, getSourceSyncsBySourceId } from "@/src/data/sources";
import { useSupaQuery } from "@/src/hooks/use-supabase";
import { Tables } from "@/types/db";
import { Button } from "@/src/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useState } from "react";

import SourceSyncsTable from "@/src/components/tables/source-syncs";
import { cn } from "@/src/utils";
import { toast } from "@/src/components/ui/use-toast";
import { Spinner } from "@/src/components/common/loading-spinner";
import { Header2 } from "@/src/components/common/header";

export default function SourceViewDrive({ source }: { source: Tables<"sources"> }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const {
    data: sourceSyncs,
    isLoading: isLoadingSourceSync,
    refetch,
  } = useSupaQuery(getSourceSyncsBySourceId, {
    arg: source.id,
    queryKey: ["getSourceSyncsBySourceId", source.id],
  });

  const handleSync = async () => {
    let syncErr;
    try {
      setIsSyncing(true);
      await syncDriveSource({ sourceId: source.id });
      toast({
        title: "Drive sync initiated successfully",
      });
    } catch (error: any) {
      syncErr = error;
      toast({
        title: "Error syncing drive",
        description: error.message,
      });
    } finally {
      setIsSyncing(false);
      // Poll for updates every second for 10 seconds
      if (!syncErr) {
        for (let i = 0; i < 10; i++) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          await refetch();
        }
      }
    }
  };

  return (
    <div className="flex flex-col space-y-3">
      <div className="flex items-center justify-between">
        <Header2 className="flex-1" title="Sync History" />
        <div className="flex justify-end">
          <Button
            onClick={handleSync}
            disabled={isSyncing || isLoadingSourceSync}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
            {isSyncing ? "Syncing..." : "Sync Now"}
          </Button>
        </div>
      </div>
      {isLoadingSourceSync ? <Spinner /> : <SourceSyncsTable data={sourceSyncs ?? []} />}
    </div>
  );
}
