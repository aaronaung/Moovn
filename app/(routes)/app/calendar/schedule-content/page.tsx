"use client";

import { Spinner } from "@/src/components/common/loading-spinner";
import { Button } from "@/src/components/ui/button";
import { getAllDestinations } from "@/src/data/destinations";
import { getScheduleSources } from "@/src/data/sources";
import { getAllTemplates } from "@/src/data/templates";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Tables } from "@/types/db";
import { TemplateCreationRequestStatus } from "@/src/consts/templates";
import { SourceTypes } from "@/src/consts/sources";
import ContentSchedulingForm from "./_components/content-scheduling-form";
import { toast } from "@/src/components/ui/use-toast";
import { useEffect, useState } from "react";
import { useSupaQuery } from "@/src/hooks/use-supabase";

const MISSING_DETAILS = {
  sources: {
    link: "/app/sources",
    message: "You must first create a source to schedule content.",
  },
  templates: {
    link: "/app/templates",
    message: "You must first create a template to schedule content.",
  },
  destinations: {
    link: "/app/destinations",
    message: "You must first create a destination to schedule content.",
  },
  connectedDestinations: {
    link: "/app/destinations",
    message: "You must connect at least one destination to schedule content.",
  },
};

export default function ScheduleContent() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  const { data: allSources } = useSupaQuery(getScheduleSources, {
    queryKey: ["getScheduleSources"],
  });
  const { data: allTemplates } = useSupaQuery(getAllTemplates, {
    queryKey: ["getAllTemplates"],
  });
  const { data: availableDestinations } = useSupaQuery(getAllDestinations, {
    queryKey: ["getAllDestinations"],
  });

  useEffect(() => {
    if (!allSources || !allTemplates || !availableDestinations) {
      return;
    }

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
    const connectedDestinations = (availableDestinations ?? []).filter(
      (destination: Tables<"destinations">) =>
        destination.linked_ig_user_id && destination.long_lived_token,
    );

    if (availableSources.length === 0) {
      toast({
        title: MISSING_DETAILS.sources.message,
        variant: "destructive",
      });
      router.push(MISSING_DETAILS.sources.link);
      return;
    }
    if (availableTemplates.length === 0) {
      toast({
        title: MISSING_DETAILS.templates.message,
        variant: "destructive",
      });
      router.push(MISSING_DETAILS.templates.link);
      return;
    }
    if (availableDestinations.length === 0) {
      toast({
        title: MISSING_DETAILS.destinations.message,
        variant: "destructive",
      });
      router.push(MISSING_DETAILS.destinations.link);
      return;
    }
    if (connectedDestinations.length === 0) {
      toast({
        title: MISSING_DETAILS.connectedDestinations.message,
        variant: "destructive",
      });
      router.push(MISSING_DETAILS.connectedDestinations.link);
      return;
    }

    setIsLoading(false);
  }, [allSources, allTemplates, availableDestinations, router]);

  if (isLoading) {
    return <Spinner className="mt-8" />;
  }

  const availableSources = allSources!.filter((source) => source.type !== SourceTypes.GoogleDrive);
  const availableTemplates = allTemplates!.filter(
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
  const connectedDestinations = availableDestinations!.filter(
    (destination: Tables<"destinations">) =>
      destination.linked_ig_user_id && destination.long_lived_token,
  );

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
