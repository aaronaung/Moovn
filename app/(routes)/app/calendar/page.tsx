"use client";
import { Button } from "@/src/components/ui/button";
import FullCalendar from "@/src/components/ui/calendar/full-calendar";
import { useRouter } from "next/navigation";

export default function Calendar() {
  const router = useRouter();

  return (
    <div className="h-[calc(100vh_-_100px)]">
      <FullCalendar
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
