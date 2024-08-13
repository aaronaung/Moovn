"use client";
import { Spinner } from "@/src/components/common/loading-spinner";
import ContentSchedulingForm from "@/src/components/forms/content-scheduling-form";
import { Button } from "@/src/components/ui/button";
import FullCalendar from "@/src/components/ui/calendar/full-calendar";
import { Sheet, SheetContent } from "@/src/components/ui/sheet";
import { getDestinationsForAuthUser } from "@/src/data/destinations";
import { getSourcesForAuthUser } from "@/src/data/sources";
import { getTemplatesForAuthUser } from "@/src/data/templates";
import { useSupaQuery } from "@/src/hooks/use-supabase";
import { useState } from "react";

export default function Calendar() {
  const [isScheduleSheetOpen, setIsScheduleSheetOpen] = useState(false);
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
    <div className="h-[calc(100vh_-_100px)]">
      <Sheet
        open={isScheduleSheetOpen}
        onOpenChange={(open) => {
          setIsScheduleSheetOpen(open);
        }}
      >
        <SheetContent className="h-[calc(100%_-_30px)]" side={"bottom"}>
          {/**
           * Form goes here
           * 1. Select schedule source (dropdown)
           * 2. Schedule range: from Aug 1st to Aug 31st
           * 3. Template: select template (This should tell us if it's weekly/daily template)
           * 4. Destination: select destination
           * 5. Show ManageContent comp based on the values above.
           * 6. Multiselect content to schedule.
           */}
          <ContentSchedulingForm
            availableDestinations={availableDestinations ?? []}
            availableSources={availableSources ?? []}
            availableTemplates={availableTemplates ?? []}
          />
        </SheetContent>
      </Sheet>
      <FullCalendar
        actionButtons={[
          <Button
            onClick={() => {
              setIsScheduleSheetOpen(true);
            }}
            className="rounded-md"
          >
            Schedule content
          </Button>,
        ]}
      />
    </div>
  );
}
