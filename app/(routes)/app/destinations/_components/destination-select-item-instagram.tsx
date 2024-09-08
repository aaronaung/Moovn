import { env } from "@/env.mjs";
import { Spinner } from "@/src/components/common/loading-spinner";
import { Button } from "@/src/components/ui/button";
import { FacebookIcon } from "@/src/components/ui/icons/facebook";
import Image from "@/src/components/ui/image";
import { DestinationTypes } from "@/src/consts/destinations";
import { getInstagramAccount, linkInstagramAccount } from "@/src/data/destinations-ig";
import { useSupaMutation, useSupaQuery } from "@/src/hooks/use-supabase";
import { isLocal } from "@/src/utils";
import { Tables } from "@/types/db";
import { CheckIcon } from "@heroicons/react/24/outline";

const generateInstagramLoginUrl = (
  destinationId: string,
) => `https://www.instagram.com/oauth/authorize?
enable_fb_login=0&
force_authentication=1&
client_id=${env.NEXT_PUBLIC_INSTAGRAM_CLIENT_ID}&
redirect_uri=${
  isLocal() ? "https://redirectmeto.com/http://localhost:3000" : window.location.origin
}/api/auth/instagram/callback&response_type=code&scope=business_basic%2Cbusiness_manage_messages%2Cbusiness_manage_comments%2Cbusiness_content_publish&
state=${destinationId}`;

export default function InstagramDestinationItem({
  destination,
  isLoadingDestination,
}: {
  destination: Tables<"destinations">;
  isLoadingDestination: boolean;
}) {
  const { data: igAccount, isLoading: isLoadingIgAccounts } = useSupaQuery(getInstagramAccount, {
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

  const handleConnectDestination = async () => {
    window.location.href = generateInstagramLoginUrl(destination.id);
  };

  if (!destination.long_lived_token || !destination.linked_ig_user_id) {
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
  if (!igAccount) {
    return <p className="text-sm text-muted-foreground">No instagram accounts found.</p>;
  }

  return (
    <div className="flex items-center justify-between gap-1">
      {/* <p className="text-xs text-muted-foreground">Linked account: </p> */}
      <div className="flex items-center gap-x-2 ">
        <Image
          alt={igAccount.username}
          className="h-7 w-7 rounded-full"
          src={igAccount.profilePictureUrl}
          retryOnError
        />
        <p className="line-clamp-1 text-sm">{igAccount.username}</p>
      </div>
      <div className="ml-2 flex h-[28px] items-center gap-1 rounded-md bg-green-600 px-3">
        <CheckIcon className="h-4 w-4 text-white" />
        <p className="text-xs text-white">Connected</p>
      </div>
    </div>
  );
}
