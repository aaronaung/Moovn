"use client";

import { Spinner } from "@/src/components/common/loading-spinner";
import { Button } from "@/src/components/ui/button";
import { RotateCw } from "lucide-react";
import { cn } from "@/src/utils";
import { format, parseISO } from "date-fns";
import { Card } from "@/src/components/ui/card";

type Event = {
  name: string;
  start: string;
  end: string;
  staff: {
    id: string;
    name: string;
    photo: string;
  }[];
};

type DaySchedule = {
  date: string;
  siteTimeZone: string;
  event: Event[];
};

interface SourceViewScheduleProps {
  scheduleData: { day: DaySchedule[] };
  isRefetching: boolean;
  onRefresh: () => void;
}

function EventCard({ event }: { event: Event }) {
  return (
    <Card className="flex flex-col justify-center bg-secondary">
      <div className="flex items-center justify-between">
        <div className="p-4">
          <p className="text-sm font-medium">{event.name}</p>
          <p className="text-sm text-muted-foreground">
            {format(parseISO(event.start), "h:mm a")} - {format(parseISO(event.end), "h:mm a")}
          </p>
          <p className="text-sm text-muted-foreground">
            {event.staff.map((staff) => staff.name).join(", ")}
          </p>
        </div>
        <div className="flex -space-x-2 self-stretch p-2">
          {event.staff.map((staff) => (
            <StaffAvatar key={staff.id} staff={staff} />
          ))}
        </div>
      </div>
    </Card>
  );
}

function StaffAvatar({ staff }: { staff: { id: string; name: string; photo: string } }) {
  return (
    <div className="h-full min-h-[2.5rem] w-10 overflow-hidden rounded-full">
      <img src={staff.photo} alt={staff.name} className="h-full w-full object-cover" />
    </div>
  );
}

export default function SourceViewSchedule({
  scheduleData,
  isRefetching,
  onRefresh,
}: SourceViewScheduleProps) {
  if (!scheduleData?.day) {
    return <p className="text-sm text-muted-foreground">No schedule data available.</p>;
  }

  return (
    <div className="flex h-full flex-col space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">View your upcoming classes and events.</p>

        <div className="flex justify-end gap-2">
          <Button onClick={onRefresh} disabled={isRefetching} variant="outline" className="gap-2">
            <RotateCw className={cn("h-4 w-4", isRefetching && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {isRefetching ? (
        <Spinner />
      ) : (
        <div className="flex-1 space-y-6 overflow-auto pb-16">
          {scheduleData.day.map((day) => (
            <div key={day.date} className="space-y-3">
              <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <p>
                  {format(parseISO(day.date), "EEEE, MMMM d")}
                  <span className="ml-2 text-sm text-muted-foreground">
                    ({day.event.length} events)
                  </span>
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {day.event.map((event, index) => (
                  <EventCard key={index} event={event} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
