"use client";

import { syncDriveSource, getSourceSyncsBySourceId } from "@/src/data/sources";
import { useSupaQuery } from "@/src/hooks/use-supabase";
import { Tables } from "@/types/db";
import { Button } from "@/src/components/ui/button";
import { RefreshCw, RotateCw } from "lucide-react";
import { useState } from "react";

import SourceSyncsTable from "@/src/components/tables/source-syncs";
import { cn } from "@/src/utils";
import { toast } from "@/src/components/ui/use-toast";
import { Spinner } from "@/src/components/common/loading-spinner";
import { Header2 } from "@/src/components/common/header";

export default function SourceViewDrive({ source }: { source: Tables<"sources"> }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPerformingImmediateRefresh, setIsPerformingImmediateRefresh] = useState(false);
  const {
    data: sourceSyncs,
    isLoading: isLoadingSourceSync,
    refetch,
    isRefetching: isRefetchingSourceSync,
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
      setIsPerformingImmediateRefresh(true);
      if (!syncErr) {
        for (let i = 0; i < 10; i++) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          await refetch();
        }
      }
      setIsPerformingImmediateRefresh(false);
    }
  };

  return (
    <div className="flex h-full flex-col space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <Header2 className="flex-1" title="Sync History" />
          <p className="text-sm text-muted-foreground">
            Syncs are performed every 3 hours and can be triggered manually.
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            onClick={handleSync}
            disabled={isSyncing || isLoadingSourceSync}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
            {isSyncing ? "Syncing..." : "Sync Now"}
          </Button>

          <Button
            onClick={() => refetch()}
            disabled={isRefetchingSourceSync && !isPerformingImmediateRefresh}
            variant="outline"
            className="gap-2"
          >
            <RotateCw
              className={cn(
                "h-4 w-4",
                isRefetchingSourceSync && !isPerformingImmediateRefresh && "animate-spin",
              )}
            />
            Refresh
          </Button>
        </div>
      </div>
      {isLoadingSourceSync ? (
        <Spinner />
      ) : (
        <div className="flex-1 overflow-auto">
          <SourceSyncsTable data={sourceSyncs ?? []} />
        </div>
      )}
    </div>
  );
}
