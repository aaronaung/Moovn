import EmptyState from "@/src/components/common/empty-state";
import { Spinner } from "@/src/components/common/loading-spinner";
import { DeleteConfirmationDialog } from "@/src/components/dialogs/delete-confirmation-dialog";
import { toast } from "@/src/components/ui/use-toast";
import { DestinationTypes } from "@/src/consts/destinations";
import { deleteContent, getContentForAuthUser } from "@/src/data/content";
import { useSupaMutation, useSupaQuery } from "@/src/hooks/use-supabase";
import { Tables } from "@/types/db";
import { useState } from "react";
import InstagramContent from "./instagram-content";
import { Header2 } from "@/src/components/common/header";
import { getSourcesForAuthUser } from "@/src/data/sources";
import { SaveContentDialog } from "@/src/components/dialogs/save-content-dialog";
import { Button } from "@/src/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { InstagramIcon } from "@/src/components/ui/icons/instagram";
import { EnvelopeIcon } from "@heroicons/react/24/solid";
import { useEmailEditor } from "@/src/contexts/email-editor";

export default function ManageContent({
  destinations,
}: {
  destinations: Tables<"destinations">[];
}) {
  const { open: openEmailEditor } = useEmailEditor();
  const [contentDialogState, setContentDialogState] = useState<{
    isOpen: boolean;
    content?: Tables<"content"> & { destination: Tables<"destinations"> | null };
    selectedDestination?: Tables<"destinations">;
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

  const handleCreateContentButtonClick = (destination: Tables<"destinations">) => {
    switch (destination.type) {
      case DestinationTypes.Instagram:
        setContentDialogState((prev) => ({
          ...prev,
          isOpen: true,
          selectedDestination: destination,
        }));
        break;
      case DestinationTypes.Email:
        openEmailEditor(
          {
            title: "Untitled",
            initialJson: "{}",
          },
          {},
        );

      default:
        break;
    }
  };

  const createContentButton = () => {
    const destinationIcon = (destination: Tables<"destinations">) => {
      switch (destination.type) {
        case DestinationTypes.Instagram:
          return <InstagramIcon className="h-4 w-4" />;
        case DestinationTypes.Email:
          return <EnvelopeIcon className="h-4 w-4" />;
        default:
          return <></>;
      }
    };

    return (
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button>Create content</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="p-2" align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Which destination is the content for?</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {destinations.map((destination) => (
              <DropdownMenuItem
                className="cursor-pointer p-2"
                key={destination.id}
                onClick={() => {
                  handleCreateContentButtonClick(destination);
                }}
              >
                <div className="flex items-center gap-x-2 ">
                  {destinationIcon(destination)}
                  <p className="line-clamp-1 text-sm">{destination.name}</p>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  if (!content || content.length === 0) {
    return (
      <>
        <SaveContentDialog
          destination={contentDialogState.selectedDestination || destinations[0]}
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
          actionButtonOverride={createContentButton()}
        />
      </>
    );
  }

  const renderContent = (
    content: Tables<"content"> & { destination: Tables<"destinations"> | null },
  ) => {
    let contentComp = <></>;
    switch (content.destination?.type) {
      case DestinationTypes.Instagram:
        contentComp = (
          <InstagramContent
            key={content.id}
            content={content}
            onEditContent={() => {
              setContentDialogState({
                isOpen: true,
                content,
              });
            }}
            onDeleteContent={() => {
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
        destination={contentDialogState.selectedDestination || destinations[0]}
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
            Content is auto-generated from a template and can be published to a destination. If you
            think an auto-generated design is incorrect, you can refresh the design or edit to
            overwrite it.
          </p>
        </div>
        {createContentButton()}
      </div>
      <div className="flex flex-wrap gap-3 overflow-scroll">
        {content?.map((content) => renderContent(content))}
      </div>
    </div>
  );
}
