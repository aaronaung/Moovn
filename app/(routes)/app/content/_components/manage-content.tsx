import EmptyState from "@/src/components/common/empty-state";
import { Spinner } from "@/src/components/common/loading-spinner";
import { DeleteConfirmationDialog } from "@/src/components/dialogs/delete-confirmation-dialog";
import { Button } from "@/src/components/ui/button";
import { toast } from "@/src/components/ui/use-toast";
import { DestinationTypes } from "@/src/consts/destinations";
import { deleteContent, getContentForAuthUser } from "@/src/data/content";
import { useSupaMutation, useSupaQuery } from "@/src/hooks/use-supabase";
import { Tables } from "@/types/db";
import { useState } from "react";
import InstagramPost from "./instagram-post";
import { Header2 } from "@/src/components/common/header";
import { getSourcesForAuthUser } from "@/src/data/sources";
import { SaveContentDialog } from "@/src/components/dialogs/save-content-dialog";

export default function ManageContent({
  destinations,
}: {
  destinations: Tables<"destinations">[];
}) {
  const [contentDialogState, setContentDialogState] = useState<{
    isOpen: boolean;
    content?: Tables<"content"> & { destination: Tables<"destinations"> | null };
  }>({
    isOpen: false,
  });
  const [deleteConfirmationDialogState, setDeleteConfirmationDialogState] = useState<{
    isOpen: boolean;
    content?: Tables<"content">;
  }>({
    isOpen: false,
  });

  const { data: sources, isLoading: isLoadingSources } = useSupaQuery(getSourcesForAuthUser, {
    queryKey: ["getSourcesForAuthUser"],
  });
  const { data: content, isLoading: isLoadingContent } = useSupaQuery(getContentForAuthUser, {
    queryKey: ["getContentForAuthUser"],
  });
  const { mutateAsync: _deleteContent, isPending: isDeletingContent } = useSupaMutation(
    deleteContent,
    {
      invalidate: [["getContentForAuthUser"]],
      onSuccess: () => {
        toast({
          title: "Content deleted",
          variant: "success",
        });
      },
      onError: (error) => {
        console.error(error);
        toast({
          title: "Failed to delete content",
          variant: "destructive",
          description: "Please try again or contact support.",
        });
      },
    },
  );

  if (isLoadingContent || isLoadingSources) {
    return <Spinner />;
  }

  if (!sources || sources.length === 0) {
    // Todo: handle empty state
    return <></>;
  }

  if (!content || content.length === 0) {
    return (
      <>
        <SaveContentDialog
          availableDestinations={destinations}
          availableSources={sources}
          isOpen={contentDialogState.isOpen}
          onClose={() => {
            setContentDialogState({
              isOpen: false,
            });
          }}
        />
        <EmptyState
          title={`No content to publish`}
          description={`Create a content to publish to a destination.`}
          actionButtonOverride={
            <Button
              onClick={() => {
                setContentDialogState({
                  isOpen: true,
                });
              }}
            >
              Create content
            </Button>
          }
        />
      </>
    );
  }

  const renderContent = (
    content: Tables<"content"> & { destination: Tables<"destinations"> | null },
  ) => {
    let contentComp = <></>;
    switch (content.destination?.type) {
      case DestinationTypes.INSTAGRAM:
        contentComp = (
          <InstagramPost
            key={content.id}
            post={content}
            onEditPost={() => {
              setContentDialogState({
                isOpen: true,
                content,
              });
            }}
            onDeletePost={() => {
              setDeleteConfirmationDialogState({
                isOpen: true,
                content,
              });
            }}
          />
        );
        break;
      default:
        return <></>;
    }

    return contentComp;
  };

  return (
    <div>
      <SaveContentDialog
        availableDestinations={destinations}
        availableSources={sources}
        isOpen={contentDialogState.isOpen}
        initFormValues={contentDialogState.content as any}
        onClose={() => {
          setContentDialogState({
            isOpen: false,
          });
        }}
      />
      <DeleteConfirmationDialog
        isOpen={deleteConfirmationDialogState.isOpen}
        label={"You'll no longer be able to publish this content. Are you sure?"}
        isDeleting={isDeletingContent}
        onClose={() => {
          setDeleteConfirmationDialogState({
            isOpen: false,
          });
        }}
        onDelete={async () => {
          if (deleteConfirmationDialogState.content) {
            await _deleteContent(deleteConfirmationDialogState.content.id);
          }
          setDeleteConfirmationDialogState({
            isOpen: false,
          });
        }}
      />
      <div className="mb-3 flex items-end">
        <div className="flex-1">
          <Header2 title="Content" />
          <p className="text-sm text-muted-foreground">
            Content is auto-generated from a template and can be published to a destination.
          </p>
        </div>
        <Button
          onClick={() => {
            setContentDialogState({
              isOpen: true,
            });
          }}
        >
          Create content
        </Button>
      </div>
      <div className="flex gap-x-2  overflow-scroll">
        {content?.map((content) => renderContent(content))}
      </div>
    </div>
  );
}
