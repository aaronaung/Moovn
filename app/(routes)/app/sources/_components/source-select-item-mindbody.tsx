"use client";

import { Spinner } from "@/src/components/common/loading-spinner";
import { Button } from "@/src/components/ui/button";
import { MindbodyLogo } from "@/src/components/ui/icons/mindbody";
import { MindbodySourceSettings } from "@/src/consts/sources";
import { getMindbodyActivationCodeAndLink, getMindbodySiteData } from "@/src/data/sources";
import { useSupaQuery } from "@/src/hooks/use-supabase";

import { Tables } from "@/types/db";
import { AlertTriangleIcon } from "lucide-react";
import Link from "next/link";

export default function SourceSelectItemMindbody({ source }: { source: Tables<"sources"> }) {
  const { data: siteData, isLoading: isLoadingSiteData } = useSupaQuery(getMindbodySiteData, {
    arg: (source.settings as MindbodySourceSettings).site_id,
    queryKey: ["getMindbodySiteData", (source.settings as MindbodySourceSettings).site_id],
  });
  const { data: activationData, isLoading: isLoadingActivationData } = useSupaQuery(
    getMindbodyActivationCodeAndLink,
    {
      arg: (source.settings as MindbodySourceSettings).site_id,
      queryKey: [
        "getMindbodyActivationCodeAndLink",
        (source.settings as MindbodySourceSettings).site_id,
      ],
      retry: false,
    },
  );
  const isLoading = isLoadingSiteData || isLoadingActivationData;

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Spinner className="text-secondary" />
      </div>
    );
  }

  if (!activationData?.link) {
    return (
      <div className="flex flex-col items-center gap-2">
        <AlertTriangleIcon className="mr-1 h-8 w-8 shrink-0 text-destructive" />
        <p className="text-center text-sm text-destructive">
          The site ID does not map to a valid Mindbody site.
        </p>
      </div>
    );
  }

  return (
    <div>
      {siteData ? (
        <MindbodyLogo className="w-[180px]" />
      ) : (
        <Link href={activationData.link} target="_blank">
          <Button className="w-full" variant="outline">
            Activate site <MindbodyLogo className="ml-1.5 w-[100px]" />
          </Button>
        </Link>
      )}
    </div>
  );
}
