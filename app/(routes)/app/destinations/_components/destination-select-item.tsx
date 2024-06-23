import { env } from "@/env.mjs";
import { Spinner } from "@/src/components/common/loading-spinner";
import { Button } from "@/src/components/ui/button";
import { Checkbox } from "@/src/components/ui/checkbox";
import { InstagramIcon } from "@/src/components/ui/icons/instagram";
import Image from "@/src/components/ui/image";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/src/components/ui/tooltip";
import { DestinationTypes } from "@/src/consts/destinations";
import { getInstagramAccounts, linkInstagramAccount } from "@/src/data/destinations-facebook";
import { useSupaMutation, useSupaQuery } from "@/src/hooks/use-supabase";
import { cn } from "@/src/utils";
import { Tables } from "@/types/db";
import { ArrowPathIcon, PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";

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
const generateFacebookLoginUrl = (destinationId: string) => `https://www.facebook.com/v20.0/dialog/oauth
?client_id=${env.NEXT_PUBLIC_FACEBOOK_APP_ID}
&display=page
&extras={setup: { channel: "IG_API_ONBOARDING" } }
&redirect_uri=http://localhost:3000/api/destinations/${destinationId}/facebook/auth/callback
&response_type=code
&scope=${scopes.join(",")}`;

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
  setDestinationDialogState: (state: { isOpen: boolean; destination?: Tables<"destinations"> }) => void;
  setDeleteConfirmationDialogState: (state: { isOpen: boolean; destination?: Tables<"destinations"> }) => void;
  destination: Tables<"destinations">;
}) {
  const { data: igAccounts, isLoading: isLoadingIgAccounts } = useSupaQuery(getInstagramAccounts, {
    arg: destination.id,
    enabled: destination.type === DestinationTypes.INSTAGRAM && !!destination.long_lived_token,
    queryKey: ["getInstagramAccounts", destination.id],
  });

  const { mutate: _linkInstagramAccount, isPending: isLinkingInstagramAccount } = useSupaMutation(
    linkInstagramAccount,
    {
      invalidate: [["getDestinationsForAuthUser"]],
    },
  );

  const handleFacebookLogin = async () => {
    window.location.href = generateFacebookLoginUrl(destination.id);
  };

  const handleConnectDestination = async () => {
    switch (destination.type) {
      case DestinationTypes.INSTAGRAM:
        handleFacebookLogin();
        break;
    }
  };

  const handleLinkInstagramAccount = async (accountId: string) => {
    _linkInstagramAccount({
      destinationId: destination.id,
      accountId,
    });
  };

  const renderLogo = () => {
    if (destination?.type === DestinationTypes.INSTAGRAM) {
      return <InstagramIcon className="text-secondary" />;
    }
    return <></>;
  };

  const renderConnectionDetails = () => {
    // For now this will be ig centric.
    if (!destination.long_lived_token) {
      return (
        <Button className="h-[80px]" variant={"outline"} onClick={handleConnectDestination}>
          Connect destination
        </Button>
      );
    }
    if (isLoadingIgAccounts || isLinkingInstagramAccount || isRefreshingDestinations) {
      return (
        <div className="my-2 flex items-center justify-center">
          <Spinner />
        </div>
      );
    }
    if (!igAccounts || (igAccounts && igAccounts.length === 0)) {
      return <p className="text-sm text-muted-foreground">No instagram accounts found.</p>;
    }

    return (
      <div>
        <Select
          value={destination.linked_ig_user_id ?? undefined}
          onValueChange={(value) => {
            handleLinkInstagramAccount(value);
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select an account to link" />
          </SelectTrigger>
          <SelectContent className="p-1">
            <SelectGroup>
              <SelectLabel>Link an instagram account</SelectLabel>
              {igAccounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  <div className="flex items-center gap-x-2 ">
                    <Image
                      alt={account.username}
                      className="h-7 w-7 rounded-full"
                      src={account.profilePictureUrl}
                      retryOnError
                    />
                    <p className="line-clamp-1 text-sm">{account.username}</p>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    );
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
      <div className="flex items-center ">
        <Checkbox id={destination.id} className="mr-2" checked={isSelected} />
        <label htmlFor={destination.id} id="destination-checkbox" className="line-clamp-1 max-w-[200px] flex-1 text-sm">
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
            className="h-9 w-9 cursor-pointer rounded-full p-2 text-destructive hover:bg-secondary-foreground hover:text-secondary"
          />
          <Tooltip>
            <TooltipTrigger>
              <ArrowPathIcon
                onClick={() => {
                  handleConnectDestination();
                }}
                className="ml-1 h-9 w-9 cursor-pointer rounded-full bg-primary p-2 text-secondary"
              />
            </TooltipTrigger>
            <TooltipContent>Reconnect destination</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <div className="flex h-full w-full items-center justify-center rounded-md bg-secondary-foreground p-8">
        {renderLogo()}
      </div>
      {renderConnectionDetails()}
    </div>
  );
}
