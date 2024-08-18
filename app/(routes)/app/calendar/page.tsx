"use client";
import { Spinner } from "@/src/components/common/loading-spinner";
import { Button } from "@/src/components/ui/button";
import FullCalendar, { CalendarEvent } from "@/src/components/ui/calendar/full-calendar";
import { ContentType } from "@/src/consts/content";
import { BUCKETS } from "@/src/consts/storage";
import { supaClientComponentClient } from "@/src/data/clients/browser";
import { getContentSchedules } from "@/src/data/content";
import { getTemplatesForAuthUser } from "@/src/data/templates";
import { useSupaQuery } from "@/src/hooks/use-supabase";
import { desconstructContentKey, fromAtScheduleExpressionToDate } from "@/src/libs/content";
import { signUrl } from "@/src/libs/storage";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Calendar() {
  const router = useRouter();
  const { data: templates, isLoading: isLoadingTemplates } = useSupaQuery(getTemplatesForAuthUser, {
    queryKey: ["getTemplatesForAuthUser"],
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
          const { templateId } = desconstructContentKey(schedule.name);
          const scheduledDate = fromAtScheduleExpressionToDate(schedule.schedule_expression);
          const template = (templates ?? []).find((template) => template.id === templateId);

          if (template && scheduledDate) {
            getEventPromises.push(
              new Promise(async (resolve, reject) => {
                try {
                  const url = await signUrl({
                    bucket: BUCKETS.scheduledContent,
                    client: supaClientComponentClient,
                    objectPath: `${template.owner_id}/${schedule.name}.jpeg`,
                  });
                  resolve({
                    title: template.name,
                    start: scheduledDate,
                    contentType: template.content_type as ContentType,
                    previewUrl: url,
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
    if (templates && contentSchedules) {
      loadCalendarEvents();
    }
  }, [templates, contentSchedules]);

  if (isLoadingTemplates || isLoadingCalendarEvents || isLoadingContentSchedules) {
    return <Spinner />;
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
            className="rounded-md"
          >
            Schedule content
          </Button>,
        ]}
      />
    </div>
  );
}
