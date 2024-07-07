"use client";

import { useSupaQuery } from "@/src/hooks/use-supabase";
import ManageContents from "./_components/manage-content";
import { getDestinationsForAuthUser } from "@/src/data/destinations";
import { Spinner } from "@/src/components/common/loading-spinner";
import EmptyState from "@/src/components/common/empty-state";

import { useRouter } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import { getSourcesForAuthUser } from "@/src/data/sources";
import { getTemplatesForAuthUser } from "@/src/data/templates";

export default function ContentPage() {
  const router = useRouter();
  const { data: destinations, isLoading: isLoadingDestinations } = useSupaQuery(
    getDestinationsForAuthUser,
    {
      queryKey: ["getDestinationsForAuthUser"],
    },
  );
  const { data: sources, isLoading: isLoadingSources } = useSupaQuery(getSourcesForAuthUser, {
    queryKey: ["getSourcesForAuthUser"],
  });
  const { data: templates, isLoading: isLoadingTemplates } = useSupaQuery(getTemplatesForAuthUser, {
    queryKey: ["getTemplatesForAuthUser"],
  });

  if (isLoadingDestinations || isLoadingSources || isLoadingTemplates) {
    return <Spinner />;
  }

  if (!destinations || destinations.length === 0) {
    return (
      <EmptyState
        title="No destinations set up"
        description="Please complete setting up at least one destination before creating content to publish."
        actionButtonOverride={
          <Button
            onClick={() => {
              router.push("/app/destinations");
            }}
          >
            Add Destination
          </Button>
        }
      />
    );
  }
  if (!sources || sources.length === 0) {
    return (
      <EmptyState
        title="No sources set up"
        description="Please complete setting up at least one source before creating content to publish."
        actionButtonOverride={
          <Button
            onClick={() => {
              router.push("/app/sources");
            }}
          >
            Add Source
          </Button>
        }
      />
    );
  }
  if (!templates || templates.length === 0) {
    return (
      <EmptyState
        title="No templates set up"
        description="Please complete setting up at least one template before creating content to publish."
        actionButtonOverride={
          <Button
            onClick={() => {
              router.push("/app/templates");
            }}
          >
            Add Template
          </Button>
        }
      />
    );
  }

  return <ManageContents destinations={destinations} />;
}
