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
import EmptyState from "@/src/components/common/empty-state";

const MISSING_DETAILS = {
  sources: {
    title: "No sources found",
    description: "Please create a source to continue.",
    link: "/app/sources",
    buttonText: "Go to Sources",
  },
  templates: {
    title: "No templates found",
    description: "Please create a template to continue.",
    link: "/app/templates",
    buttonText: "Go to Templates",
  },
  destinations: {
    title: "No destinations found",
    description: "Please create a destination to continue.",
    link: "/app/destinations",
    buttonText: "Go to Destinations",
  },
  connectedDestinations: {
    title: "No connected destinations found",
    description: "Please connect a destination to continue.",
    link: "/app/destinations",
    buttonText: "Go to Destinations",
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

  if (isLoadingSources || isLoadingTemplates || isLoadingDestinations) {
    return <Spinner className="mt-8" />;
  }

  const connectedDestinations = (availableDestinations ?? []).filter(
    (destination) => destination.linked_ig_user_id && destination.long_lived_token,
  );

  let missingDetails = null;

  if ((connectedDestinations ?? []).length === 0)
    missingDetails = MISSING_DETAILS.connectedDestinations;
  if ((availableDestinations ?? []).length === 0) missingDetails = MISSING_DETAILS.destinations;
  if ((availableTemplates ?? []).length === 0) missingDetails = MISSING_DETAILS.templates;
  if ((availableSources ?? []).length === 0) missingDetails = MISSING_DETAILS.sources;

  if (missingDetails) {
    return (
      <EmptyState
        title={missingDetails.title}
        description={missingDetails.description}
        onAction={() => router.push(missingDetails.link)}
        actionButtonText={missingDetails.buttonText}
        actionButtonIcon={null}
      />
    );
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
