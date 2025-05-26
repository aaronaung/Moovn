"use client";

import { useState, useMemo, useEffect } from "react";
import { format, startOfMonth, endOfMonth, addMonths } from "date-fns";
import { Avatar, AvatarImage, AvatarFallback } from "@/src/components/ui/avatar";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { Calendar } from "@/src/components/ui/calendar";
import { Spinner } from "@/src/components/common/loading-spinner";
import { getScheduleDataForSourceByTimeRange } from "@/src/data/sources";
import { useSupaQuery } from "@/src/hooks/use-supabase";
import { useQueryClient } from "@tanstack/react-query";

import { Tables } from "@/types/db";
import { userDisplayName } from "@/src/libs/user";
import { CalendarIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";

interface StudioLandingPageProps {
  studio: Tables<"users">;
  sources: Tables<"sources">[];
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
}

interface DaySchedule {
  date: string;
  siteTimeZone: string;
  event: ClassEvent[];
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

export function StudioLandingPage({ studio, sources }: StudioLandingPageProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const queryClient = useQueryClient();

  // Get today's date for initial load
  const today = new Date();

  // Calculate month range for fetching (based on selected date for calendar, today for main view)
  const dateForFetching = showCalendar ? selectedDate : today;
  const monthStart = startOfMonth(dateForFetching);
  const monthEnd = endOfMonth(dateForFetching);

  // Fetch current month's schedule data
  const {
    data: monthScheduleData,
    isLoading,
    isError,
  } = useSupaQuery(
    () => {
      if (sources.length === 0) return Promise.resolve({ day: [] });
      // For now, use the first source. In a real app, you might want to combine multiple sources
      const primarySource = sources[0];
      return getScheduleDataForSourceByTimeRange({
        id: primarySource.id,
        dateRange: {
          from: monthStart,
          to: monthEnd,
        },
        flatten: false,
      });
    },
    {
      queryKey: [
        "getScheduleDataForSourceByTimeRange",
        sources[0]?.id,
        format(monthStart, "yyyy-MM-dd"),
        format(monthEnd, "yyyy-MM-dd"),
      ],
      enabled: sources.length > 0,
    },
  );

  // Background prefetching effect for next month when navigating
  useEffect(() => {
    if (!showCalendar || sources.length === 0) return;

    const nextMonth = addMonths(dateForFetching, 1);
    const nextMonthStart = startOfMonth(nextMonth);
    const nextMonthEnd = endOfMonth(nextMonth);

    const primarySource = sources[0];

    // Prefetch the next month in the background
    queryClient.prefetchQuery({
      queryKey: [
        "getScheduleDataForSourceByTimeRange",
        primarySource.id,
        format(nextMonthStart, "yyyy-MM-dd"),
        format(nextMonthEnd, "yyyy-MM-dd"),
      ],
      queryFn: () =>
        getScheduleDataForSourceByTimeRange({
          id: primarySource.id,
          dateRange: {
            from: nextMonthStart,
            to: nextMonthEnd,
          },
          flatten: false,
        }),
      staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    });
  }, [selectedDate, showCalendar, sources, queryClient, dateForFetching]);

  // Create a map of date -> classes for quick lookup
  const scheduleByDate = useMemo(() => {
    if (!monthScheduleData?.day) return {};

    const dateMap: { [date: string]: ClassEvent[] } = {};

    monthScheduleData.day.forEach((daySchedule: DaySchedule) => {
      dateMap[daySchedule.date] = daySchedule.event || [];
    });

    return dateMap;
  }, [monthScheduleData]);

  // Get classes for the appropriate date (today for main view, selected date for calendar view)
  const displayDate = showCalendar ? selectedDate : today;
  const displayDateString = format(displayDate, "yyyy-MM-dd");
  const classes = scheduleByDate[displayDateString] || [];

  const getStudioInitials = () => {
    if (studio.first_name && studio.last_name) {
      return `${studio.first_name[0]}${studio.last_name[0]}`.toUpperCase();
    }
    if (studio.email) {
      return studio.email[0].toUpperCase();
    }
    return "S";
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

          {/* Calendar - removed card wrapper */}
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

            {sources.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                No studio sources configured.
              </p>
            ) : isLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : isError ? (
              <p className="py-8 text-center text-red-500">
                Error loading classes. Please try again.
              </p>
            ) : classes.length === 0 ? (
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
        {/* Header with studio info */}
        <header className="px-4 py-8 text-center">
          <div className="mb-4 flex justify-center">
            <Avatar className="h-20 w-20">
              <AvatarImage
                src={getAvatarSrc(studio.avatar_url) as string | undefined}
                alt={userDisplayName(studio) ?? ""}
              />
              <AvatarFallback className="text-lg">{getStudioInitials()}</AvatarFallback>
            </Avatar>
          </div>
          <h1 className="mb-2 text-2xl font-bold">{userDisplayName(studio)}</h1>
        </header>

        {/* Today's Classes Section */}
        <div className="mb-6 px-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Today's Classes</h2>
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

          {sources.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No studio sources configured.</p>
          ) : isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : isError ? (
            <p className="py-8 text-center text-red-500">
              Error loading classes. Please try again.
            </p>
          ) : classes.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No classes scheduled for today.
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

function ClassCard({ classEvent }: { classEvent: ClassEvent }) {
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

        <div className="mb-2">
          <p className="text-sm text-muted-foreground">
            with {classEvent.staff.map((s) => s.name).join(", ")}
          </p>
        </div>

        <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
          <span>🕐</span>
          <span>{formatTimeRange(classEvent.start, classEvent.end)}</span>
        </div>

        <Button className="w-full" size="default">
          Book Now
        </Button>
      </CardContent>
    </Card>
  );
}
