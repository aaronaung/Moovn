"use client";
import { Spinner } from "@/src/components/common/loading-spinner";
import { Button } from "@/src/components/ui/button";
import FullCalendar, { CalendarEvent } from "@/src/components/ui/calendar/full-calendar";
import { getContentSchedules } from "@/src/data/content";
import { useSupaQuery } from "@/src/hooks/use-supabase";
import { deconstructScheduleName, fromAtScheduleExpressionToDate } from "@/src/libs/content";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import EventDialog from "./_components/event-dialog";
import { add, endOfMonth, format, startOfMonth, startOfToday, sub } from "date-fns";
import { getDataFromScheduleSourcesByTimeRange } from "@/src/data/sources";
import {
  extractScheduleDataWithinRange,
  organizeScheduleDataByView,
} from "@/src/libs/sources/utils";
import { generateDesignHash } from "@/src/libs/designs/util";
import { SourceDataView } from "@/src/consts/sources";
import { signUrl } from "@/src/data/r2";
import { contentItemR2Path } from "@/src/libs/storage";

export default function Calendar() {
  const router = useRouter();
  const today = startOfToday();

  const [currentMonth, setCurrentMonth] = useState(format(today, "MMM-yyyy"));

  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [previewUrls, setPreviewUrls] = useState<Map<string, string>>(new Map());

  const [isLoadingCalendarEvents, setIsLoadingCalendarEvents] = useState(true);
  const [isLoadingPreviewUrls, setIsLoadingPreviewUrls] = useState(true);

  const [eventDialog, setEventDialog] = useState<{
    isOpen: boolean;
    event?: CalendarEvent;
  }>({
    isOpen: false,
  });

  const { data: contentSchedules, isLoading: isLoadingContentSchedules } = useSupaQuery(
    getContentSchedules,
    {
      queryKey: ["getContentSchedules"],
    },
  );
  const { data: scheduleDataFromAllSources, isLoading: isLoadingScheduleDataFromAllSources } =
    useSupaQuery(getDataFromScheduleSourcesByTimeRange, {
      arg: {
        dateRange: {
          from: sub(startOfMonth(today), { days: 7 }),
          to: add(endOfMonth(today), { days: 7 }),
        },
      },
      queryKey: ["getDataFromScheduleSourcesByTimeRange"],
      refetchOnWindowFocus: false,
    });

  useEffect(() => {
    const loadPreviewUrls = async () => {
      try {
        const contentItemPreviewUrlPromises: Promise<{
          contentItemId: string;
          url: string;
        }>[] = [];
        for (const contentSchedule of contentSchedules || []) {
          const contentItems = contentSchedule.content?.content_items;
          for (const item of contentItems || []) {
            contentItemPreviewUrlPromises.push(
              new Promise(async (resolve) => {
                const signedUrl = await signUrl(
                  "scheduled-content",
                  contentItemR2Path(contentSchedule.owner_id, contentSchedule.content_id, item.id),
                );
                resolve({
                  contentItemId: item.id,
                  url: signedUrl,
                });
              }),
            );
          }
        }
        const contentItemPreviewUrlData = await Promise.all(contentItemPreviewUrlPromises);
        const contentItemPreviewUrls = new Map<string, string>();
        for (const data of contentItemPreviewUrlData) {
          contentItemPreviewUrls.set(data.contentItemId, data.url);
        }
        setPreviewUrls(contentItemPreviewUrls);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingPreviewUrls(false);
      }
    };

    if (contentSchedules && contentSchedules.length > 0) {
      loadPreviewUrls();
    } else {
      setIsLoadingPreviewUrls(isLoadingContentSchedules);
    }
  }, [contentSchedules]);

  useEffect(() => {
    const loadCalendarEvents = async () => {
      try {
        const contentMap = new Map(contentSchedules?.map((c) => [c.content_id, c.content]) || []);
        const scheduleDataMap = new Map(); // sourceId -> dailyEvents
        for (const [sourceId, data] of Object.entries(scheduleDataFromAllSources || {})) {
          const dailyEvents = organizeScheduleDataByView(SourceDataView.Daily, data) || {};
          scheduleDataMap.set(sourceId, dailyEvents);
        }

        const calendarEvents = (contentSchedules || []).map((schedule) => {
          const { range, contentId } = deconstructScheduleName(schedule.name);
          const scheduledDate = fromAtScheduleExpressionToDate(schedule.schedule_expression);
          const content = contentMap.get(contentId);

          if (!content || !scheduledDate || !scheduleDataMap.has(content.source_id)) {
            return null;
          }

          const dataForEvent = extractScheduleDataWithinRange(
            range,
            scheduleDataMap.get(content.source_id)!,
          );

          const hasDataChanged = content.content_items.some(
            (item) => generateDesignHash(item.template_item_id || "", dataForEvent) !== item.hash,
          );

          return {
            contentSchedule: schedule,
            data: dataForEvent,
            hasDataChanged,
            title: content.template?.name ?? "Untitled",
            start: scheduledDate,
          } as CalendarEvent;
        });

        setCalendarEvents(calendarEvents.filter((event) => event !== null) as CalendarEvent[]);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingCalendarEvents(false);
      }
    };
    if (contentSchedules && scheduleDataFromAllSources) {
      loadCalendarEvents();
    } else {
      setIsLoadingCalendarEvents(isLoadingContentSchedules || isLoadingScheduleDataFromAllSources);
    }
  }, [contentSchedules, scheduleDataFromAllSources]);

  if (isLoadingCalendarEvents || isLoadingPreviewUrls) {
    return <Spinner className="mt-8" />;
  }

  return (
    <div className="h-[calc(100vh_-_32px)]">
      {eventDialog.event && (
        <EventDialog
          isOpen={eventDialog.isOpen}
          onClose={() => setEventDialog((prev) => ({ ...prev, isOpen: false }))}
          event={eventDialog.event}
          previewUrls={previewUrls}
        />
      )}
      <FullCalendar
        currentMonth={currentMonth}
        setCurrentMonth={setCurrentMonth}
        events={calendarEvents}
        previewUrls={previewUrls}
        onEventClick={(event) => {
          setEventDialog({
            isOpen: true,
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
            Schedule
          </Button>,
        ]}
      />
    </div>
  );
}
