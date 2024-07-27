import { env } from "@/env.mjs";
import { Spinner } from "@/src/components/common/loading-spinner";
import { Button } from "@/src/components/ui/button";
import { FacebookIcon } from "@/src/components/ui/icons/facebook";
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
import { Tables } from "@/types/db";

const scopes = [
  "instagram_manage_comments",
  "instagram_manage_insights",
  "pages_show_list",

  // Needed for content publishing
  "instagram_basic",
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
&redirect_uri=${window.location.origin}/api/auth/facebook/callback
&response_type=code
&scope=${scopes.join(",")}
&state=${destinationId}`;

export default function InstagramDestinationItem({
  destination,
  isLoadingDestination,
}: {
  destination: Tables<"destinations">;
  isLoadingDestination: boolean;
}) {
  const { data: igAccounts, isLoading: isLoadingIgAccounts } = useSupaQuery(getInstagramAccounts, {
    arg: destination.id,
    enabled: destination.type === DestinationTypes.Instagram && !!destination.long_lived_token,
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
      case DestinationTypes.Instagram:
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

  if (!destination.long_lived_token) {
    return (
      <Button
        className="hover: h-[80px] rounded-md bg-[#1877F2] text-white hover:bg-[#3B5998]"
        onClick={handleConnectDestination}
      >
        <FacebookIcon className="mr-2 h-7 w-7 text-white" />
        Login with Facebook
      </Button>
    );
  }
  if (isLoadingIgAccounts || isLinkingInstagramAccount || isLoadingDestination) {
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
    <div className="flex gap-2">
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
      <Tooltip>
        <TooltipTrigger>
          <Button
            className="hover: h-[38px] rounded-md bg-[#1877F2] text-white hover:bg-[#3B5998]"
            onClick={handleConnectDestination}
          >
            <FacebookIcon className="h-6 w-6 text-white" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Link a different Facebook account</TooltipContent>{" "}
      </Tooltip>
    </div>
  );
}
