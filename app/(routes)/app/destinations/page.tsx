"use client";
import EmptyState from "@/src/components/common/empty-state";
import { Header2 } from "@/src/components/common/header";
import { Spinner } from "@/src/components/common/loading-spinner";
import { DeleteConfirmationDialog } from "@/src/components/dialogs/delete-confirmation-dialog";
import { Button } from "@/src/components/ui/button";
import { toast } from "@/src/components/ui/use-toast";
import { useSupaMutation, useSupaQuery } from "@/src/hooks/use-supabase";
import { Tables } from "@/types/db";
import { useEffect, useState } from "react";
import DestinationSelectItem from "./_components/destination-select-item";
import { deleteDestination, getDestinationsForAuthUser } from "@/src/data/destinations";
import { SaveDestinationDialog } from "@/src/components/dialogs/save-destination-dialog";
import { DestinationTypes } from "@/src/consts/destinations";
import InstagramDestinationView from "./_components/destination-view-instagram";
import EmailDestinationView from "./_components/destination-view-email";

export default function DestinationsPage() {
  const [destinationDialogState, setDestinationDialogState] = useState<{
    isOpen: boolean;
    destination?: Tables<"destinations">;
  }>({
    isOpen: false,
  });
  const [deleteConfirmationDialogState, setDeleteConfirmationDialogState] = useState<{
    isOpen: boolean;
    destination?: Tables<"destinations">;
  }>({
    isOpen: false,
  });

  const {
    data: destinations,
    isLoading: isLoadingDestinations,
    isRefetching: isRefetchingDestinations,
  } = useSupaQuery(getDestinationsForAuthUser, {
    queryKey: ["getDestinationsForAuthUser"],
  });
  const [selectedDestination, setSelectedDestination] = useState<Tables<"destinations">>();
  useEffect(() => {
    if (destinations && destinations.length > 0 && !selectedDestination) {
      setSelectedDestination(destinations[0]);
    }
  }, [destinations, selectedDestination]);

  const { mutateAsync: _deleteDestination, isPending: isDeletingTemplate } = useSupaMutation(
    deleteDestination,
    {
      invalidate: [["getDestinationsForAuthUser"]],
      onSuccess: () => {
        toast({
          title: "Destination deleted",
          variant: "success",
        });
      },
      onError: (error) => {
        console.error(error);
        toast({
          title: "Failed to delete destination",
          variant: "destructive",
          description: "Please try again or contact support.",
        });
      },
    },
  );

  if (isLoadingDestinations) {
    return <Spinner />;
  }

  if (destinations && destinations.length === 0) {
    return (
      <>
        <SaveDestinationDialog
          isOpen={destinationDialogState.isOpen}
          onClose={() => {
            setDestinationDialogState({
              isOpen: false,
            });
          }}
        />
        <EmptyState
          title="No destinations found"
          description="Add a destination to get started"
          actionButtonOverride={
            <Button
              onClick={() => {
                setDestinationDialogState({
                  isOpen: true,
                });
              }}
            >
              Add destination
            </Button>
          }
        />
      </>
    );
  }

  const renderDestinationView = () => {
    switch (selectedDestination?.type) {
      case DestinationTypes.Instagram:
        return <InstagramDestinationView destination={selectedDestination} />;
      case DestinationTypes.Email:
        return <EmailDestinationView destination={selectedDestination} />;
      default:
        return <></>;
    }
  };

  return (
    <div className="mt-2 flex flex-col">
      <DeleteConfirmationDialog
        isOpen={deleteConfirmationDialogState.isOpen}
        label={"You'll no longer be able to post content to the destination. Are you sure?"}
        isDeleting={isDeletingTemplate}
        onClose={() => {
          setDeleteConfirmationDialogState({
            isOpen: false,
          });
        }}
        onDelete={async () => {
          if (deleteConfirmationDialogState.destination) {
            await _deleteDestination(deleteConfirmationDialogState.destination.id);
          }
          setDeleteConfirmationDialogState({
            isOpen: false,
          });
        }}
      />
      <SaveDestinationDialog
        isOpen={destinationDialogState.isOpen}
        onClose={() => {
          setDestinationDialogState({
            isOpen: false,
          });
        }}
        initFormValues={destinationDialogState.destination as any}
      />
      <div className="mb-3 flex items-end">
        <div className="flex-1">
          <Header2 title="Destinations" />
          <p className="text-sm text-muted-foreground">
            Destination represents the platform where your content is published.
          </p>
        </div>
        <Button
          onClick={() => {
            setDestinationDialogState({
              isOpen: true,
            });
          }}
        >
          Create destination
        </Button>
      </div>
      <div className="flex gap-x-2">
        {(destinations || []).map((destination) => (
          <DestinationSelectItem
            key={destination.id}
            isRefreshingDestinations={isRefetchingDestinations}
            isSelected={selectedDestination?.id === destination.id}
            destination={destination}
            setSelectedDestination={setSelectedDestination}
            setDestinationDialogState={setDestinationDialogState}
            setDeleteConfirmationDialogState={setDeleteConfirmationDialogState}
          />
        ))}
      </div>
      <div className="mt-4 flex flex-1 flex-col gap-2 overflow-hidden">
        {renderDestinationView()}
      </div>
    </div>
  );
}
