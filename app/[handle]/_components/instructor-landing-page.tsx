"use client";

import { useState, useMemo, useEffect } from "react";
import { format, startOfMonth, endOfMonth, isAfter, startOfDay, addMonths } from "date-fns";
import { Avatar, AvatarImage, AvatarFallback } from "@/src/components/ui/avatar";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { Calendar } from "@/src/components/ui/calendar";
import { Spinner } from "@/src/components/common/loading-spinner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Tables } from "@/types/db";
import { userDisplayName } from "@/src/libs/user";
import { CalendarIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";

interface InstructorLandingPageProps {
  handle: string;
}

interface ClassEvent {
  name: string;
  start: string;
  end: string;
  staff: {
    id: string;
    name: string;
    photo: string;
  }[];
  price?: number;
  studioName: string;
  sourceId: string;
}

interface InstructorScheduleResponse {
  instructor: Tables<"users">;
  scheduleByDate: { [date: string]: ClassEvent[] };
}

const formatTime = (timeString: string) => {
  try {
    const date = new Date(timeString);
    return format(date, "h:mm a");
  } catch {
    return timeString;
  }
};

const formatTimeRange = (start: string, end: string) => {
  return `${formatTime(start)} - ${formatTime(end)}`;
};

// Utility function to safely handle avatar URL
const getAvatarSrc = (avatarUrl: string | null | undefined): string | undefined => {
  return avatarUrl || undefined;
};

// Mock price data for demonstration (in a real app, this would come from the API)
const getClassPrice = (className: string): number => {
  const prices: { [key: string]: number } = {
    "Vinyasa Flow": 18,
    "Hip Hop Dance": 15,
    "Pilates Reformer": 25,
    Yoga: 20,
    Barre: 22,
    Spin: 18,
  };

  // Find a matching price or return a default
  for (const [key, price] of Object.entries(prices)) {
    if (className.toLowerCase().includes(key.toLowerCase())) {
      return price;
    }
  }
  return 20; // Default price
};

const fetchInstructorSchedule = async (
  handle: string,
  fromDate: string,
  toDate: string,
): Promise<InstructorScheduleResponse> => {
  const response = await fetch(`/api/instructors/${handle}/schedule?from=${fromDate}&to=${toDate}`);

  if (!response.ok) {
    throw new Error("Failed to fetch instructor schedule");
  }

  return response.json();
};

export function InstructorLandingPage({ handle }: InstructorLandingPageProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const queryClient = useQueryClient();

  // Get today's date for filtering upcoming classes
  const today = new Date();

  // Calculate month range for fetching (based on selected date for calendar, today for main view)
  const dateForFetching = showCalendar ? selectedDate : today;
  const monthStart = startOfMonth(dateForFetching);
  const monthEnd = endOfMonth(dateForFetching);

  // Fetch instructor schedule data for current month
  const {
    data: scheduleData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [
      "instructorSchedule",
      handle,
      format(monthStart, "yyyy-MM-dd"),
      format(monthEnd, "yyyy-MM-dd"),
    ],
    queryFn: () =>
      fetchInstructorSchedule(
        handle,
        format(monthStart, "yyyy-MM-dd"),
        format(monthEnd, "yyyy-MM-dd"),
      ),
  });

  // Background prefetching effect for next month when navigating
  useEffect(() => {
    if (!showCalendar) return;

    const nextMonth = addMonths(dateForFetching, 1);
    const nextMonthStart = startOfMonth(nextMonth);
    const nextMonthEnd = endOfMonth(nextMonth);

    // Prefetch the next month in the background
    queryClient.prefetchQuery({
      queryKey: [
        "instructorSchedule",
        handle,
        format(nextMonthStart, "yyyy-MM-dd"),
        format(nextMonthEnd, "yyyy-MM-dd"),
      ],
      queryFn: () =>
        fetchInstructorSchedule(
          handle,
          format(nextMonthStart, "yyyy-MM-dd"),
          format(nextMonthEnd, "yyyy-MM-dd"),
        ),
      staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    });
  }, [selectedDate, showCalendar, handle, queryClient, dateForFetching]);

  const instructor = scheduleData?.instructor;
  const scheduleByDate = scheduleData?.scheduleByDate || {};

  // Get classes for the appropriate date
  const displayDate = showCalendar ? selectedDate : today;
  const displayDateString = format(displayDate, "yyyy-MM-dd");
  const classes = scheduleByDate[displayDateString] || [];

  // For main view, get all upcoming classes (not just today)
  const upcomingClasses = useMemo(() => {
    if (showCalendar) return classes;

    const upcoming: (ClassEvent & { date: string })[] = [];
    const todayStart = startOfDay(today);

    Object.entries(scheduleByDate).forEach(([dateString, dayClasses]) => {
      const classDate = new Date(dateString);
      if (isAfter(classDate, todayStart) || dateString === format(today, "yyyy-MM-dd")) {
        dayClasses.forEach((classEvent) => {
          const classDateTime = new Date(classEvent.start);
          if (isAfter(classDateTime, today)) {
            upcoming.push({
              ...classEvent,
              date: dateString,
            });
          }
        });
      }
    });

    // Sort by date and time
    return upcoming.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [scheduleByDate, showCalendar, classes, today]);

  const getInstructorInitials = () => {
    if (instructor?.first_name && instructor?.last_name) {
      return `${instructor.first_name[0]}${instructor.last_name[0]}`.toUpperCase();
    }
    if (instructor?.first_name) {
      return instructor.first_name[0].toUpperCase();
    }
    return "I";
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      // Don't close calendar view - keep user in calendar mode
    }
  };

  const handleMonthChange = (month: Date) => {
    // Update selected date to the first day of the new month to trigger refetch
    setSelectedDate(month);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (isError || !instructor) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Instructor Not Found</h1>
          <p className="mt-2 text-gray-600">
            The instructor you're looking for doesn't exist or isn't available.
          </p>
        </div>
      </div>
    );
  }

  if (showCalendar) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-md">
          {/* Header */}
          <header className="flex items-center justify-between p-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCalendar(false)}
              className="flex items-center gap-2"
            >
              <ArrowLeftIcon className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-semibold">Calendar</h1>
            <div className="w-8" /> {/* Spacer for centering */}
          </header>

          {/* Calendar */}
          <div className="p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              onMonthChange={handleMonthChange}
              className="mx-auto w-fit rounded-md border"
            />
          </div>

          {/* Classes for selected date */}
          <div className="p-4">
            <h2 className="mb-4 text-lg font-semibold">
              Classes for {format(selectedDate, "MMMM d")}
            </h2>

            {classes.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                No classes scheduled for this date.
              </p>
            ) : (
              <div className="space-y-4">
                {classes.map((classEvent, index) => (
                  <ClassCard
                    key={index}
                    classEvent={{ ...classEvent, price: getClassPrice(classEvent.name) }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md">
        {/* Header with instructor info */}
        <header className="px-4 py-8 text-center">
          <div className="mb-4 flex justify-center">
            <Avatar className="h-20 w-20">
              <AvatarImage
                src={getAvatarSrc(instructor.avatar_url) as string | undefined}
                alt={userDisplayName(instructor) ?? ""}
              />
              <AvatarFallback className="text-lg">{getInstructorInitials()}</AvatarFallback>
            </Avatar>
          </div>
          <h1 className="mb-2 text-2xl font-bold">{userDisplayName(instructor)}</h1>
          <p className="text-muted-foreground">Instructor</p>
        </header>

        {/* Upcoming Classes Section */}
        <div className="mb-6 px-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Upcoming Classes</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCalendar(true)}
              className="flex items-center gap-2"
            >
              <CalendarIcon className="h-4 w-4" />
              Calendar
            </Button>
          </div>

          {upcomingClasses.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No upcoming classes scheduled.</p>
          ) : (
            <div className="space-y-4">
              {upcomingClasses.slice(0, 10).map((classEvent, index) => (
                <ClassCard
                  key={index}
                  classEvent={{ ...classEvent, price: getClassPrice(classEvent.name) }}
                  showDate={true}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ClassCard({
  classEvent,
  showDate = false,
}: {
  classEvent: ClassEvent & { date?: string };
  showDate?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-base font-semibold">{classEvent.name}</h3>
          {classEvent.price && (
            <span className="whitespace-nowrap font-mono text-base font-bold">
              ${classEvent.price}
            </span>
          )}
        </div>

        {classEvent.studioName && (
          <div className="mb-2">
            <p className="text-sm text-muted-foreground">at {classEvent.studioName}</p>
          </div>
        )}

        <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
          <span>🕐</span>
          <span>
            {showDate && classEvent.date && <>{format(new Date(classEvent.date), "MMM d")} •</>}
            {formatTimeRange(classEvent.start, classEvent.end)}
          </span>
        </div>

        <Button className="w-full" size="default">
          Book Now
        </Button>
      </CardContent>
    </Card>
  );
}
