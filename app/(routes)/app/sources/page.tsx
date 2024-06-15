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
  const [deleteConfirmationDialogState, setDeleteConfirmationDialogState] =
    useState<{
      isOpen: boolean;
      source?: Tables<"sources">;
    }>({
      isOpen: false,
    });

  const { data: sources, isLoading: isLoadingSources } = useSupaQuery(
    getSourcesForAuthUser,
    {
      queryKey: ["getSourcesForAuthUser"],
    },
  );
  const [selectedSource, setSelectedSource] = useState<Tables<"sources">>();
  useEffect(() => {
    if (sources && sources.length > 0 && !selectedSource) {
      setSelectedSource(sources[0]);
    }
  }, [sources, selectedSource]);

  const { mutateAsync: _deleteSource, isPending: isDeletingTemplate } =
    useSupaMutation(deleteSource, {
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
    });

  if (isLoadingSources) {
    return <Spinner />;
  }

  if (sources && sources.length === 0) {
    return (
      <>
        <SaveSourceDialog
          isOpen={sourceDialogState.isOpen}
          onClose={() => {
            setSourceDialogState({
              isOpen: false,
            });
          }}
        />
        <EmptyState
          title="No sources found"
          description="Add a source to get started"
          actionButtonOverride={
            <Button
              onClick={() => {
                setSourceDialogState({
                  isOpen: true,
                });
              }}
            >
              Add Source
            </Button>
          }
        />
      </>
    );
  }

  return (
    <div className="flex h-[calc(100vh-110px)] flex-col">
      <DeleteConfirmationDialog
        isOpen={deleteConfirmationDialogState.isOpen}
        label={
          "All designs created from this source will be deleted. Are you sure?"
        }
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
          <p className="text-sm text-muted-foreground">
            Manage where your data comes from.
          </p>
        </div>
        <Button
          onClick={() => {
            setSourceDialogState({
              isOpen: true,
            });
          }}
        >
          Create source
        </Button>
      </div>
      <div className="flex gap-x-2">
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
        {selectedSource ? (
          <>
            <div>
              <Header2 title="Data view" />
              <p className="text-sm text-muted-foreground">
                See what your schedule data looks like for Daily, Weekly, and
                Monthly views.
              </p>
            </div>
            <DataView selectedSource={selectedSource} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Select a source to see what your data looks like.
          </p>
        )}
      </div>
    </div>
  );
}
