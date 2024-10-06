import { Spinner } from "@/src/components/common/loading-spinner";
import ContentSchedulingFormWrapper from "./_components/content-scheduling-form-wrapper";
import { Button } from "@/src/components/ui/button";
import { getDestinationsForAuthUser } from "@/src/data/destinations";
import { getSourcesForAuthUser } from "@/src/data/sources";
import { getTemplatesForAuthUser } from "@/src/data/templates";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Tables } from "@/types/db";
import { supaServerComponentClient } from "@/src/data/clients/server";
import { TemplateCreationRequestStatus } from "@/src/consts/templates";
import { SourceTypes } from "@/src/consts/sources";

const MISSING_DETAILS = {
  sources: {
    link: "/app/sources",
  },
  templates: {
    link: "/app/templates",
  },
  destinations: {
    link: "/app/destinations",
  },
  connectedDestinations: {
    link: "/app/destinations",
  },
};

export default async function ScheduleContent() {
  const allSources = await getSourcesForAuthUser({ client: supaServerComponentClient() });
  const allTemplates = await getTemplatesForAuthUser({ client: supaServerComponentClient() });

  const availableSources = allSources.filter((source) => source.type !== SourceTypes.GoogleDrive);
  const availableTemplates = allTemplates.filter(
    (template) =>
      template.template_creation_requests.length === 0 ||
      template.template_creation_requests.every(
        (r) => r.status === TemplateCreationRequestStatus.Done,
      ),
  );
  const availableDestinations = await getDestinationsForAuthUser({
    client: supaServerComponentClient(),
  });
  const connectedDestinations = (availableDestinations ?? []).filter(
    (destination: Tables<"destinations">) =>
      destination.linked_ig_user_id && destination.long_lived_token,
  );

  if (!availableSources || !availableTemplates || !availableDestinations) {
    return <Spinner className="mt-8" />;
  }

  if (availableSources.length === 0) {
    redirect(MISSING_DETAILS.sources.link);
  }
  if (availableTemplates.length === 0) {
    redirect(MISSING_DETAILS.templates.link);
  }
  if (availableDestinations.length === 0) {
    redirect(MISSING_DETAILS.destinations.link);
  }
  if (connectedDestinations.length === 0) {
    redirect(MISSING_DETAILS.connectedDestinations.link);
  }

  return (
    <div>
      <Link href="/app/calendar" passHref>
        <Button variant="ghost" className="mb-2">
          <ArrowLeftIcon className="h-4 w-4" />
        </Button>
      </Link>
      <ContentSchedulingFormWrapper
        connectedDestinations={connectedDestinations}
        availableSources={availableSources}
        availableTemplates={availableTemplates}
      />
    </div>
  );
}
