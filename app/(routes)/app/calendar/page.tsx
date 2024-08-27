"use client";
import { Spinner } from "@/src/components/common/loading-spinner";
import { Button } from "@/src/components/ui/button";
import FullCalendar, { CalendarEvent } from "@/src/components/ui/calendar/full-calendar";
import { ContentType } from "@/src/consts/content";
import { BUCKETS } from "@/src/consts/storage";
import { supaClientComponentClient } from "@/src/data/clients/browser";
import { getContentsForAuthUser, getContentSchedules } from "@/src/data/content";
import { useSupaQuery } from "@/src/hooks/use-supabase";
import { deconstructScheduleName, fromAtScheduleExpressionToDate } from "@/src/libs/content";
import { signUrlForPathOrChildPaths } from "@/src/libs/storage";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Calendar() {
  const router = useRouter();
  const { data: contents, isLoading: isLoadingContents } = useSupaQuery(getContentsForAuthUser, {
    queryKey: ["getContentsForAuthUser"],
  });
  const { data: contentSchedules, isLoading: isLoadingContentSchedules } = useSupaQuery(
    getContentSchedules,
    {
      queryKey: ["getContentSchedules"],
    },
  );

  const [isLoadingCalendarEvents, setIsLoadingCalendarEvents] = useState(true);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    const loadCalendarEvents = async () => {
      try {
        setIsLoadingCalendarEvents(true);
        const getEventPromises: Promise<CalendarEvent>[] = [];
        for (const schedule of contentSchedules ?? []) {
          const { contentId } = deconstructScheduleName(schedule.name);
          const scheduledDate = fromAtScheduleExpressionToDate(schedule.schedule_expression);
          const content = contents?.find((c) => c.id === contentId);

          if (content && scheduledDate) {
            getEventPromises.push(
              new Promise(async (resolve, reject) => {
                try {
                  const signUrlData = await signUrlForPathOrChildPaths(
                    BUCKETS.scheduledContent,
                    `${content.owner_id}/${content.id}`,
                    supaClientComponentClient,
                  );
                  resolve({
                    title: content.template?.name ?? "Untitled",
                    start: scheduledDate,
                    contentType: content.type as ContentType,
                    previewUrl: signUrlData.map((data) => data.url)[0],
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
    if (contents && contentSchedules) {
      loadCalendarEvents();
    }
  }, [contents, contentSchedules]);

  if (isLoadingContents || isLoadingCalendarEvents || isLoadingContentSchedules) {
    return <Spinner className="mt-8" />;
  }

  return (
    <div className="h-[calc(100vh_-_100px)]">
      <FullCalendar
        events={calendarEvents}
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
