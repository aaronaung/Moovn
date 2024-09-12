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
import {
  extractScheduleDataWithinRange,
  organizeScheduleDataByView,
} from "@/src/libs/sources/utils";
import { generateDesignHash } from "@/src/libs/designs/util";
import { SourceDataView } from "@/src/consts/sources";

export default function Calendar() {
  const router = useRouter();
  const today = startOfToday();

  const [currentMonth, setCurrentMonth] = useState(format(today, "MMM-yyyy"));

  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [previewUrls, setPreviewUrls] = useState<Map<string, string[]>>(new Map());

  const [isLoadingCalendarEvents, setIsLoadingCalendarEvents] = useState(true);
  const [isLoadingPreviewUrls, setIsLoadingPreviewUrls] = useState(true);

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
        from: sub(startOfMonth(today), { days: 7 }),
        to: add(endOfMonth(today), { days: 7 }),
      },
      queryKey: ["getScheduleDataFromAllSourcesByTimeRange"],
      refetchOnWindowFocus: false,
    },
  );
  useEffect(() => {
    const loadPreviewUrls = async () => {
      try {
        setIsLoadingPreviewUrls(true);
        const previewUrls = new Map<string, string[]>();
        const previewUrlPromises: Promise<{ contentId: string; urls: string[] }>[] = [];
        for (const content of contents || []) {
          previewUrlPromises.push(
            new Promise(async (resolve) => {
              const signUrlData = await signUrlForPathOrChildPaths(
                "scheduled-content",
                `${content.owner_id}/${content.id}`,
                content.template?.is_carousel || false,
              );
              resolve({
                contentId: content.id,
                urls: signUrlData.map((data) => data.url),
              });
            }),
          );
        }
        const previewUrlData = await Promise.all(previewUrlPromises);
        for (const data of previewUrlData) {
          previewUrls.set(data.contentId, data.urls);
        }
        setPreviewUrls(previewUrls);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingPreviewUrls(false);
      }
    };

    if (contents && contents.length > 0) {
      loadPreviewUrls();
    }
  }, [contents]);

  useEffect(() => {
    const loadCalendarEvents = async () => {
      try {
        const contentMap = new Map(contents?.map((c) => [c.id, c]) || []);
        const scheduleDataMap = new Map();
        for (const [sourceId, data] of Object.entries(scheduleDataFromAllSources || {})) {
          const dailyEvents = organizeScheduleDataByView(SourceDataView.Daily, data) || {};
          scheduleDataMap.set(sourceId, dailyEvents);
        }

        const calendarEvents = await Promise.all(
          (contentSchedules || []).map(async (schedule) => {
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

            const dataHash = generateDesignHash(content.template?.id || "", dataForEvent);
            const hasDataChanged = dataHash !== content.data_hash;

            return {
              contentId: content.id,
              scheduleName: schedule.name,
              data: dataForEvent,
              hasDataChanged,
              title: content.template?.name ?? "Untitled",
              start: scheduledDate,
              contentType: content.type as ContentType,
            };
          }),
        );

        setCalendarEvents(calendarEvents.filter((event) => event !== null) as CalendarEvent[]);
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

  if (isLoadingCalendarEvents || isLoadingPreviewUrls) {
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
          previewUrls={previewUrls}
        />
      )}
      <FullCalendar
        currentMonth={currentMonth}
        setCurrentMonth={setCurrentMonth}
        events={calendarEvents}
        previewUrls={previewUrls}
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
