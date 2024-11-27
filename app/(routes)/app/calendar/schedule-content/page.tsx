import { Spinner } from "@/src/components/common/loading-spinner";
import { Button } from "@/src/components/ui/button";
import { getAllDestinations } from "@/src/data/destinations";
import { getScheduleSources } from "@/src/data/sources";
import { getAllTemplates } from "@/src/data/templates";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Tables } from "@/types/db";
import { supaServerComponentClient } from "@/src/data/clients/server";
import { TemplateCreationRequestStatus } from "@/src/consts/templates";
import { SourceTypes } from "@/src/consts/sources";
import ContentSchedulingForm from "./_components/content-scheduling-form";

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
  const allSources = await getScheduleSources({
    client: await supaServerComponentClient(),
  });
  const allTemplates = await getAllTemplates({
    client: await supaServerComponentClient(),
  });

  const availableSources = allSources.filter((source) => source.type !== SourceTypes.GoogleDrive);
  const availableTemplates = allTemplates.filter(
    (template) =>
      template.template_items.length > 0 ||
      template.template_items.every(
        (item) =>
          item.template_item_design_requests.length === 0 ||
          item.template_item_design_requests.every(
            (r) => r.status === TemplateCreationRequestStatus.Done,
          ),
      ),
  );
  const availableDestinations = await getAllDestinations({
    client: await supaServerComponentClient(),
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
    <>
      <div className="w-fit">
        <Link href="/app/calendar">
          <Button variant="ghost" className="mb-2">
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
        </Link>
      </div>
      <ContentSchedulingForm
        availableDestinations={connectedDestinations}
        availableSources={availableSources}
        availableTemplates={availableTemplates}
      />
    </>
  );
}
