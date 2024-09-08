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
import { toast } from "@/src/components/ui/use-toast";
import { useEffect } from "react";

const MISSING_DETAILS = {
  sources: {
    title: "No sources found",
    description: "Please create a source to continue.",
    link: "/app/sources",
  },
  templates: {
    title: "No templates found",
    description: "Please create a template to continue.",
    link: "/app/templates",
  },
  destinations: {
    title: "No destinations found",
    description: "Please create a destination to continue.",
    link: "/app/destinations",
  },
  connectedDestinations: {
    title: "No connected destinations found",
    description: "Please connect a destination to continue.",
    link: "/app/destinations",
  },
};

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
  const connectedDestinations = (availableDestinations ?? []).filter(
    (destination) => destination.linked_ig_user_id && destination.long_lived_token,
  );

  useEffect(() => {
    if (isLoadingSources || isLoadingTemplates || isLoadingDestinations) {
      return;
    }

    if ((availableSources ?? []).length === 0) {
      toast({
        title: MISSING_DETAILS.sources.title,
        description: MISSING_DETAILS.sources.description,
      });
      router.push(MISSING_DETAILS.sources.link);
      return;
    }
    if ((availableTemplates ?? []).length === 0) {
      toast({
        title: MISSING_DETAILS.templates.title,
        description: MISSING_DETAILS.templates.description,
      });
      router.push(MISSING_DETAILS.templates.link);
      return;
    }
    if ((availableDestinations ?? []).length === 0) {
      toast({
        title: MISSING_DETAILS.destinations.title,
        description: MISSING_DETAILS.destinations.description,
      });
      router.push(MISSING_DETAILS.destinations.link);
      return;
    }
    if ((connectedDestinations ?? []).length === 0) {
      toast({
        title: MISSING_DETAILS.connectedDestinations.title,
        description: MISSING_DETAILS.connectedDestinations.description,
      });
      router.push(MISSING_DETAILS.connectedDestinations.link);
      return;
    }
  }, [
    availableSources,
    connectedDestinations,
    availableTemplates,
    availableDestinations,
    isLoadingSources,
    isLoadingTemplates,
    isLoadingDestinations,
    router,
  ]);

  if (isLoadingSources || isLoadingTemplates || isLoadingDestinations) {
    return <Spinner className="mt-8" />;
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
        availableDestinations={connectedDestinations ?? []}
        availableSources={availableSources ?? []}
        availableTemplates={availableTemplates ?? []}
      />
    </div>
  );
}
