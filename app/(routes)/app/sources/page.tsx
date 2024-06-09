"use client";
import EmptyState from "@/src/components/common/empty-state";
import { Header2 } from "@/src/components/common/header";
import { Spinner } from "@/src/components/common/loading-spinner";
import { DeleteConfirmationDialog } from "@/src/components/dialogs/delete-confirmation-dialog";
import { SaveSourceDialog } from "@/src/components/dialogs/save-source-dialog";
import { Button } from "@/src/components/ui/button";
import { toast } from "@/src/components/ui/use-toast";
import { useAuthUser } from "@/src/contexts/auth";
import {
  deleteSource,
  getSourcesForAuthUser,
  saveSource,
} from "@/src/data/sources";
import { useSupaMutation, useSupaQuery } from "@/src/hooks/use-supabase";
import { Tables } from "@/types/db";
import { useState } from "react";
import { SourceContainer } from "./_components/source-container";

export default function SourcesPage() {
  const { user } = useAuthUser();
  const [selectedSource, setSelectedSource] = useState<Tables<"sources">>();
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

  const { mutate: _saveSource, isPending: isSavingSource } = useSupaMutation(
    saveSource,
    {
      invalidate: [["getSourcesForAuthUser"]],
      onSuccess: () => {
        toast({
          title: "Changes saved",
          variant: "success",
        });
      },
      onError: (error) => {
        console.error(error);
        toast({
          title: "Failed to save changes",
          variant: "destructive",
          description: "Please try again or contact support.",
        });
      },
    },
  );

  if (isLoadingSources) {
    return <Spinner />;
  }

  if (sources && sources.length === 0) {
    return (
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
    );
  }

  return (
    <div>
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
          <SourceContainer
            key={source.id}
            selected={selectedSource?.id === source.id}
            source={source}
            setSelectedSource={setSelectedSource}
            setSourceDialogState={setSourceDialogState}
            setDeleteConfirmationDialogState={setDeleteConfirmationDialogState}
          />
        ))}
      </div>
    </div>
  );
}
