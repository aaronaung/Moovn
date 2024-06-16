import { env } from "@/env.mjs";
import { Button } from "@/src/components/ui/button";
import { Checkbox } from "@/src/components/ui/checkbox";
import { InstagramIcon } from "@/src/components/ui/icons/instagram";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/src/components/ui/tooltip";
import { DestinationTypes } from "@/src/consts/destinations";
import { cn } from "@/src/utils";
import { Tables } from "@/types/db";
import {
  CheckCircleIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

import { RefreshCcw } from "lucide-react";

const scopes = [
  "instagram_manage_comments",
  "instagram_manage_insights",
  "pages_show_list",

  // Needed for content publishing
  "instagram_basic",
  "pages_read_engagement",
  "instagram_content_publish",
  "business_management",
  "ads_management",
  "pages_read_engagement",
];
const generateFacebookLoginUrl = (
  destinationId: string,
) => `https://www.facebook.com/v20.0/dialog/oauth
?client_id=${env.NEXT_PUBLIC_FACEBOOK_APP_ID}
&display=page
&extras={setup: { channel: "IG_API_ONBOARDING" } }
&redirect_uri=http://localhost:3000/api/destinations/${destinationId}/facebook/auth/callback
&response_type=code
&scope=${scopes.join(",")}`;

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
  const handleFacebookLogin = async () => {
    // if (session) {
    //   // This ensures that the session is saved in localStorage so that it can be restored on redirect completion.
    //   window.localStorage.setItem(TEMP_SESSION_KEY, JSON.stringify(session));
    window.location.href = generateFacebookLoginUrl(destination.id);
    // }
  };

  const handleConnectDestination = async () => {
    switch (destination.type) {
      case DestinationTypes.INSTAGRAM:
        handleFacebookLogin();
        break;
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
        "relative flex min-h-[200px] min-w-[300px] cursor-pointer flex-col gap-2 rounded-md px-4 pb-4 pt-2 hover:bg-secondary",
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
      {!destination.long_lived_token ? (
        // For now, this is for Instagram only
        <Button
          className="h-[80px]"
          variant={"outline"}
          onClick={handleConnectDestination}
        >
          Connect destination
        </Button>
      ) : (
        <div className="flex h-[80px] items-center gap-2">
          <div className="flex h-full flex-1 items-center justify-center gap-x-2 rounded-md bg-green-200 text-sm text-secondary-foreground dark:bg-green-800">
            <CheckCircleIcon width={18} /> Connected
          </div>
          <Tooltip>
            <TooltipTrigger>
              <Button
                className="rounded-md"
                variant={"outline"}
                onClick={handleConnectDestination}
              >
                <RefreshCcw width={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh connection</TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  );
}
