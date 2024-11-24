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
import { deleteDestination, getAllDestinations } from "@/src/data/destinations";
import { SaveDestinationDialog } from "@/src/components/dialogs/save-destination-dialog";
import { DestinationTypes } from "@/src/consts/destinations";
import InstagramDestinationView from "./_components/destination-view-instagram";
import EmailDestinationView from "./_components/destination-view-email";
import DestinationView from "./_components/destination-view";

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
  } = useSupaQuery(getAllDestinations, {
    queryKey: ["getAllDestinations"],
  });
  const [selectedDestination, setSelectedDestination] = useState<Tables<"destinations">>();
  const hasDestinations = destinations && destinations.length > 0;
  useEffect(() => {
    if (hasDestinations && !selectedDestination) {
      setSelectedDestination(destinations[0]);
    }
  }, [hasDestinations, selectedDestination, destinations]);

  const { mutateAsync: _deleteDestination, isPending: isDeletingTemplate } = useSupaMutation(
    deleteDestination,
    {
      invalidate: [["getAllDestinations"]],
      onSuccess: () => {
        toast({
          title: "Destination deleted",
          variant: "success",
        });
      },
      onError: (error) => {
        console.error(error);
        toast({
          title: "Failed to delete destination. ",
          variant: "destructive",
          duration: 10000,
          description:
            "If you have scheduled contents associated with this destination, please remove them first. If the issue persists, please contact support.",
        });
      },
    },
  );

  if (isLoadingDestinations) {
    return <Spinner className="mt-8" />;
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
    <div>
      <DeleteConfirmationDialog
        isOpen={deleteConfirmationDialogState.isOpen}
        label={
          "Deleting this destination will delete all associated scheduled contents. Are you sure?"
        }
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
          <p className="hidden text-sm text-muted-foreground sm:block">
            Destinations represent the platforms where your content is published. Once set up, you
            can start generating content and scheduling it on your{" "}
            <a href="/app/calendar" className="text-primary underline">
              Content Calendar
            </a>
            .
          </p>
        </div>
        {hasDestinations && (
          <Button
            onClick={() => {
              setDestinationDialogState({
                isOpen: true,
              });
            }}
          >
            Create destination
          </Button>
        )}
      </div>
      {hasDestinations ? (
        <>
          <div className="flex gap-x-2 overflow-scroll">
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
          <div className="mt-4 flex-1 overflow-auto">
            {selectedDestination ? (
              <DestinationView destination={selectedDestination} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a destination to see its schedules.
              </p>
            )}
          </div>
        </>
      ) : (
        <EmptyState
          description="No destinations found. Create one to get started."
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
      )}
    </div>
  );
}
