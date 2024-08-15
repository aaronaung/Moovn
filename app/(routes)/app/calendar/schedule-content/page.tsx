"use client";
import { Spinner } from "@/src/components/common/loading-spinner";
import ContentSchedulingForm from "@/app/(routes)/app/calendar/schedule-content/_components/content-scheduling-form";
import { Button } from "@/src/components/ui/button";
import { getDestinationsForAuthUser } from "@/src/data/destinations";
import { getSourcesForAuthUser } from "@/src/data/sources";
import { getTemplatesForAuthUser } from "@/src/data/templates";
import { useSupaQuery } from "@/src/hooks/use-supabase";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";

export default function ScheduleContent() {
  const router = useRouter();
  const { data: availableSources, isLoading: isLoadingSources } = useSupaQuery(
    getSourcesForAuthUser,
    {
      queryKey: ["getSourcesForAuthUser"],
    },
  );
  const { data: availableTemplates, isLoading: isLoadingTemplates } = useSupaQuery(
    getTemplatesForAuthUser,
    {
      queryKey: ["getTemplatesForAuthUser"],
    },
  );
  const { data: availableDestinations, isLoading: isLoadingDestinations } = useSupaQuery(
    getDestinationsForAuthUser,
    {
      queryKey: ["getDestinationsForAuthUser"],
    },
  );

  if (isLoadingSources || isLoadingTemplates || isLoadingDestinations) {
    return <Spinner />;
  }
  return (
    <div>
      <Button
        variant="ghost"
        className="mb-2"
        onClick={() => {
          router.back();
        }}
      >
        <ArrowLeftIcon className="h-4 w-4" />
      </Button>
      <ContentSchedulingForm
        availableDestinations={availableDestinations ?? []}
        availableSources={availableSources ?? []}
        availableTemplates={availableTemplates ?? []}
      />
    </div>
  );
}
