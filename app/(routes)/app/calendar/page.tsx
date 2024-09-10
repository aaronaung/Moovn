"use client";
import { Spinner } from "@/src/components/common/loading-spinner";
import { Button } from "@/src/components/ui/button";
import FullCalendar, { CalendarEvent } from "@/src/components/ui/calendar/full-calendar";
import { ContentType } from "@/src/consts/content";
import { getContentsForAuthUser, getContentSchedules } from "@/src/data/content";
import { useSupaQuery } from "@/src/hooks/use-supabase";
import { deconstructScheduleName, fromAtScheduleExpressionToDate } from "@/src/libs/content";
import { signUrlForPathOrChildPaths } from "@/src/libs/storage";
import { Tables } from "@/types/db";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import EventDialog from "./_components/event-dialog";
import { add, endOfMonth, format, startOfMonth, startOfToday, sub } from "date-fns";
import { getScheduleDataFromAllSourcesByTimeRange } from "@/src/data/sources";
import { extractScheduleDataWithinRange } from "@/src/libs/sources/utils";
import { generateDesignHash } from "@/src/libs/designs/util";

export default function Calendar() {
  const router = useRouter();
  const today = startOfToday();

  const [currentMonth, setCurrentMonth] = useState(format(today, "MMM-yyyy"));

  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [isLoadingCalendarEvents, setIsLoadingCalendarEvents] = useState(true);
  const [eventDialog, setEventDialog] = useState<{
    isOpen: boolean;
    content?: Tables<"content"> & { template: Tables<"templates"> | null };
    event?: CalendarEvent;
  }>({
    isOpen: false,
  });

  const { data: contents } = useSupaQuery(getContentsForAuthUser, {
    queryKey: ["getContentsForAuthUser"],
  });
  const { data: contentSchedules } = useSupaQuery(getContentSchedules, {
    queryKey: ["getContentSchedules"],
  });
  const { data: scheduleDataFromAllSources } = useSupaQuery(
    getScheduleDataFromAllSourcesByTimeRange,
    {
      arg: {
        from: sub(startOfMonth(currentMonth), { days: 7 }),
        to: add(endOfMonth(currentMonth), { days: 7 }),
      },
      queryKey: ["getScheduleDataFromAllSourcesByTimeRange"],
      refetchOnWindowFocus: false,
    },
  );

  useEffect(() => {
    const loadCalendarEvents = async () => {
      try {
        const getEventPromises: Promise<CalendarEvent>[] = [];
        for (const schedule of contentSchedules ?? []) {
          const { range, contentId } = deconstructScheduleName(schedule.name);

          const scheduledDate = fromAtScheduleExpressionToDate(schedule.schedule_expression);
          const content = contents?.find((c) => c.id === contentId);
          if (content && scheduledDate && scheduleDataFromAllSources) {
            const dataForEvent = extractScheduleDataWithinRange(
              range,
              scheduleDataFromAllSources[content.source_id],
            );

            const dataHash = generateDesignHash(content.template?.id || "", dataForEvent);
            const hasDataChanged = dataHash !== content.data_hash;

            getEventPromises.push(
              new Promise(async (resolve, reject) => {
                try {
                  const signUrlData = await signUrlForPathOrChildPaths(
                    "scheduled-content",
                    `${content.owner_id}/${content.id}`,
                  );
                  resolve({
                    contentId: content.id,
                    scheduleName: schedule.name,
                    data: dataForEvent,
                    hasDataChanged,
                    title: content.template?.name ?? "Untitled",
                    start: scheduledDate,
                    contentType: content.type as ContentType,
                    previewUrls: signUrlData.map((data) => data.url),
                  });
                } catch (err: any) {
                  reject(err.message);
                }
              }),
            );
          }
        }
        setCalendarEvents(await Promise.all(getEventPromises));
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingCalendarEvents(false);
      }
    };
    if (contents && contentSchedules && scheduleDataFromAllSources) {
      loadCalendarEvents();
    }
  }, [contents, contentSchedules, scheduleDataFromAllSources]);

  if (isLoadingCalendarEvents) {
    return <Spinner className="mt-8" />;
  }

  return (
    <div className="h-[calc(100vh_-_100px)]">
      {eventDialog.content && eventDialog.event && (
        <EventDialog
          isOpen={eventDialog.isOpen}
          onClose={() => setEventDialog((prev) => ({ ...prev, isOpen: false }))}
          content={eventDialog.content}
          event={eventDialog.event}
        />
      )}
      <FullCalendar
        currentMonth={currentMonth}
        setCurrentMonth={setCurrentMonth}
        events={calendarEvents}
        onEventClick={(event) => {
          const content = contents?.find((c) => c.id === event.contentId);
          setEventDialog({
            isOpen: true,
            content,
            event,
          });
        }}
        actionButtons={[
          <Button
            key={"schedule-content"}
            onClick={() => {
              router.push("/app/calendar/schedule-content");
            }}
          >
            Schedule content
          </Button>,
        ]}
      />
    </div>
  );
}
