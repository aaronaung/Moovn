"use client";
import EmptyState from "@/src/components/common/empty-state";
import { Header2 } from "@/src/components/common/header";
import { Spinner } from "@/src/components/common/loading-spinner";
import { DeleteConfirmationDialog } from "@/src/components/dialogs/delete-confirmation-dialog";
import { SaveSourceDialog } from "@/src/components/dialogs/save-source-dialog";
import { Button } from "@/src/components/ui/button";
import { toast } from "@/src/components/ui/use-toast";
import { deleteSource, getSourcesForAuthUser } from "@/src/data/sources";
import { useSupaMutation, useSupaQuery } from "@/src/hooks/use-supabase";
import { Tables } from "@/types/db";
import { useEffect, useState } from "react";
import { SourceSelectItem } from "./_components/source-select-item";
import DataView from "./_components/data-view";

export default function SourcesPage() {
  const [sourceDialogState, setSourceDialogState] = useState<{
    isOpen: boolean;
    source?: Tables<"sources">;
  }>({
    isOpen: false,
  });
  const [deleteConfirmationDialogState, setDeleteConfirmationDialogState] = useState<{
    isOpen: boolean;
    source?: Tables<"sources">;
  }>({
    isOpen: false,
  });

  const { data: sources, isLoading: isLoadingSources } = useSupaQuery(getSourcesForAuthUser, {
    queryKey: ["getSourcesForAuthUser"],
  });
  const [selectedSource, setSelectedSource] = useState<Tables<"sources">>();
  const hasSources = sources && sources.length > 0;
  useEffect(() => {
    if (hasSources && !selectedSource) {
      setSelectedSource(sources[0]);
    }
  }, [hasSources, selectedSource, sources]);

  const { mutateAsync: _deleteSource, isPending: isDeletingTemplate } = useSupaMutation(
    deleteSource,
    {
      invalidate: [["getSourcesForAuthUser"]],
      onSuccess: () => {
        toast({
          title: "Source deleted",
          variant: "success",
        });
      },
      onError: (error) => {
        console.error(error);
        toast({
          title: "Failed to delete source",
          variant: "destructive",
          description: "Please try again or contact support.",
        });
      },
    },
  );

  const renderSourceDetails = () => {
    if (!selectedSource) {
      return (
        <p className="text-sm text-muted-foreground">
          Select a source to see what your data looks like.
        </p>
      );
    }
    return <DataView selectedSource={selectedSource} />;
  };

  if (isLoadingSources) {
    return <Spinner className="mt-8" />;
  }

  return (
    <div className="mt-2 flex flex-col sm:h-[calc(100vh-80px)]">
      <DeleteConfirmationDialog
        isOpen={deleteConfirmationDialogState.isOpen}
        label={"Deleting this source will delete all associated scheduled contents. Are you sure?"}
        isDeleting={isDeletingTemplate}
        onClose={() => {
          setDeleteConfirmationDialogState({
            isOpen: false,
          });
        }}
        onDelete={async () => {
          if (deleteConfirmationDialogState.source) {
            await _deleteSource(deleteConfirmationDialogState.source.id);
          }
          setDeleteConfirmationDialogState({
            isOpen: false,
          });
        }}
      />
      <SaveSourceDialog
        isOpen={sourceDialogState.isOpen}
        onClose={() => {
          setSourceDialogState({
            isOpen: false,
          });
        }}
        initFormValues={sourceDialogState.source as any}
      />

      <div className="mb-3 flex items-end">
        <div className="flex-1">
          <Header2 title="Sources" />
          <p className="hidden text-sm text-muted-foreground sm:block">
            Connect to data sources like Pike13, Mindbody, and Google sheet and start generating{" "}
            <a className="text-primary underline" href="/app/templates">
              designs.
            </a>
          </p>
        </div>
        {hasSources && (
          <Button
            onClick={() => {
              setSourceDialogState({
                isOpen: true,
              });
            }}
          >
            Create source
          </Button>
        )}
      </div>
      {hasSources ? (
        <>
          <div className="flex gap-x-2 overflow-scroll">
            {(sources || []).map((source) => (
              <SourceSelectItem
                key={source.id}
                isSelected={selectedSource?.id === source.id}
                source={source}
                setSelectedSource={setSelectedSource}
                setSourceDialogState={setSourceDialogState}
                setDeleteConfirmationDialogState={setDeleteConfirmationDialogState}
              />
            ))}
          </div>
          <div className="mt-4 flex flex-1 flex-col gap-2 overflow-hidden">
            {renderSourceDetails()}
          </div>
        </>
      ) : (
        <EmptyState
          description="No sources found. Create one to get started."
          actionButtonOverride={
            <Button
              onClick={() => {
                setSourceDialogState({
                  isOpen: true,
                });
              }}
            >
              Create source
            </Button>
          }
        />
      )}
    </div>
  );
}
