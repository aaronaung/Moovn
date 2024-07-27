import { Checkbox } from "@/src/components/ui/checkbox";
import { InstagramIcon } from "@/src/components/ui/icons/instagram";
import { DestinationTypes } from "@/src/consts/destinations";
import { cn } from "@/src/utils";
import { Tables } from "@/types/db";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import InstagramDestinationItem from "./destination-select-item-instagram";
import { EnvelopeIcon } from "@heroicons/react/24/solid";

export default function DestinationSelectItem({
  isRefreshingDestinations,
  isSelected,
  setSelectedDestination,
  setDeleteConfirmationDialogState,
  setDestinationDialogState,
  destination,
}: {
  isRefreshingDestinations: boolean;
  isSelected: boolean;
  setSelectedDestination: (destination: Tables<"destinations">) => void;
  setDestinationDialogState: (state: {
    isOpen: boolean;
    destination?: Tables<"destinations">;
  }) => void;
  setDeleteConfirmationDialogState: (state: {
    isOpen: boolean;
    destination?: Tables<"destinations">;
  }) => void;
  destination: Tables<"destinations">;
}) {
  const renderLogo = () => {
    switch (destination?.type) {
      case DestinationTypes.Instagram:
        return <InstagramIcon className="text-secondary" />;
      default:
        return <EnvelopeIcon className="h-8 w-8 text-secondary" />;
    }
  };

  const renderDestinationDetails = () => {
    switch (destination.type) {
      case DestinationTypes.Instagram:
        return (
          <InstagramDestinationItem
            destination={destination}
            isLoadingDestination={isRefreshingDestinations}
          />
        );
      default:
        return <></>;
    }
  };

  return (
    <div
      key={destination.id}
      className={cn(
        "relative flex min-h-[200px] min-w-[350px] cursor-pointer flex-col gap-2 rounded-md px-4 pb-4 pt-2 hover:bg-secondary",
        isSelected && "bg-secondary",
      )}
      onClick={() => {
        setSelectedDestination(destination);
      }}
    >
      <div className="flex items-center justify-end ">
        <div className="flex flex-1 items-center">
          <Checkbox id={destination.id} className="mr-2" checked={isSelected} />
          <label
            htmlFor={destination.id}
            id="destination-checkbox"
            className="line-clamp-1 max-w-[200px] flex-1 text-sm"
          >
            {destination.name}
          </label>
        </div>
        <div className="mb-1 flex gap-x-0.5">
          <PencilSquareIcon
            onClick={() => {
              setDestinationDialogState({
                isOpen: true,
                destination,
              });
            }}
            className="h-9 w-9 cursor-pointer rounded-full p-2 text-secondary-foreground hover:bg-secondary-foreground hover:text-secondary"
          />
          <TrashIcon
            onClick={() => {
              setDeleteConfirmationDialogState({
                isOpen: true,
                destination,
              });
            }}
            className="h-9 w-9 cursor-pointer rounded-full p-2 text-destructive hover:bg-secondary-foreground hover:text-secondary"
          />
        </div>
      </div>
      <div className="flex h-full w-full items-center justify-center rounded-md bg-secondary-foreground p-8">
        {renderLogo()}
      </div>
      {renderDestinationDetails()}
    </div>
  );
}
