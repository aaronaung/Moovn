import { NextRequest, NextResponse } from "next/server";
import { supaServerClient } from "@/src/data/clients/server";
import { getInstructorLinkedSourcesByHandle } from "@/src/data/studio-instructor-links";
import { getScheduleDataFromSource } from "@/src/libs/sources";

interface ClassEvent {
  name: string;
  start: string;
  end: string;
  staff: {
    id: string;
    name: string;
    photo: string;
  }[];
  studioName: string;
  sourceId: string;
}

interface DaySchedule {
  date: string;
  siteTimeZone: string;
  event: ClassEvent[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> },
) {
  try {
    const { handle } = await params;
    const { searchParams } = new URL(request.url);

    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");

    if (!fromDate || !toDate) {
      return NextResponse.json(
        { error: "Missing required parameters: from and to dates" },
        { status: 400 },
      );
    }

    const client = supaServerClient();

    // Get instructor and their linked sources
    const { instructor, links } = await getInstructorLinkedSourcesByHandle(handle, { client });
    if (!instructor) {
      return NextResponse.json({ error: "Instructor not found" }, { status: 404 });
    }

    const linkedSources = links.map((link: any) => link.source).filter(Boolean);
    if (linkedSources.length === 0) {
      return NextResponse.json({
        instructor,
        scheduleByDate: {},
      });
    }

    // Create a map of source_id -> instructor's id_in_source for quick lookup
    const instructorIdsBySource = new Map<string, string>();
    links.forEach((link: any) => {
      if (link.source_id && link.id_in_source) {
        instructorIdsBySource.set(link.source_id, link.id_in_source);
      }
    });

    // Fetch schedule data for all linked sources in parallel
    const schedulePromises = linkedSources.map(async (source: any) => {
      try {
        const schedule = await getScheduleDataFromSource(
          source.id,
          fromDate,
          toDate,
          false, // Don't flatten - we need the structured data
        );

        return {
          source,
          schedule,
        };
      } catch (error) {
        console.error(`Error fetching schedule for source ${source.id}:`, error);
        return {
          source,
          schedule: { day: [] },
        };
      }
    });

    const allScheduleData = await Promise.all(schedulePromises);
    console.log(JSON.stringify(allScheduleData, null, 2));

    // Process and filter schedule data for the instructor
    const scheduleByDate: { [date: string]: ClassEvent[] } = {};

    allScheduleData.forEach(({ source, schedule }) => {
      if (!schedule || !schedule.day) return;

      // Get the instructor's ID in this source
      const instructorIdInSource = instructorIdsBySource.get(source.id);
      if (!instructorIdInSource) return; // Skip if instructor not linked to this source
      console.log(JSON.stringify(schedule, null, 2));
      schedule.day.forEach((daySchedule: DaySchedule) => {
        // Filter classes where the instructor is teaching (by ID match)
        const instructorClasses = daySchedule.event.filter((classEvent) =>
          classEvent.staff.some((staff) => staff.id.toString() === instructorIdInSource),
        );

        console.log(JSON.stringify(instructorClasses, null, 2));
        if (instructorClasses.length > 0) {
          // Add studio name and source ID to each class
          const classesWithStudio = instructorClasses.map((classEvent) => ({
            ...classEvent,
            studioName: source.name,
            sourceId: source.id,
          }));

          if (!scheduleByDate[daySchedule.date]) {
            scheduleByDate[daySchedule.date] = [];
          }
          scheduleByDate[daySchedule.date].push(...classesWithStudio);
        }
      });
    });

    return NextResponse.json({
      instructor,
      scheduleByDate,
    });
  } catch (error) {
    console.error("Error fetching instructor schedule:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
