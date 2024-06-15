import { Checkbox } from "@/src/components/ui/checkbox";
import { InstagramIcon } from "@/src/components/ui/icons/instagram";
import { DestinationTypes } from "@/src/consts/destinations";
import { TEMP_SESSION_KEY, useAuthUser } from "@/src/contexts/auth";
import { cn } from "@/src/utils";
import { Tables } from "@/types/db";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";

export default function DestinationSelectItem({
  isSelected,
  setSelectedDestination,
  setDeleteConfirmationDialogState,
  setDestinationDialogState,
  destination,
}: {
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
  const { session } = useAuthUser();
  const handleFacebookLogin = async () => {
    if (session) {
      // This ensures that the session is saved in localStorage so that it can be restored on redirect completion.
      window.localStorage.setItem(TEMP_SESSION_KEY, JSON.stringify(session));
    }
  };

  const renderLogo = () => {
    if (destination?.type === DestinationTypes.INSTAGRAM) {
      return <InstagramIcon className="text-secondary" />;
    }
    return <></>;
  };

  return (
    <div
      key={destination.id}
      className={cn(
        "relative flex h-[200px] min-w-[300px] cursor-pointer flex-col gap-2 rounded-md px-4 pb-4 pt-2 hover:bg-secondary",
        isSelected && "bg-secondary",
      )}
      onClick={() => {
        setSelectedDestination(destination);
      }}
    >
      <div className="flex items-center ">
        <Checkbox id={destination.id} className="mr-2" checked={isSelected} />
        <label
          htmlFor={destination.id}
          id="destination-checkbox"
          className="flex-1 text-sm"
        >
          {destination.name}
        </label>
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
            className="h-9 w-9 cursor-pointer rounded-full p-2 text-destructive hover:bg-secondary-foreground"
          />
        </div>
      </div>
      <div className="flex h-full w-full items-center justify-center rounded-md bg-secondary-foreground p-8">
        {renderLogo()}
      </div>
    </div>
  );
}
