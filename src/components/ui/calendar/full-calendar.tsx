"use client";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/20/solid";
import { add, endOfWeek, format, parse, startOfToday, startOfWeek } from "date-fns";
import { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from "../dropdown-menu";
import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { Button } from "../button";
import FullCalendarMonthlyView from "./monthly-view";
import FullCalendarWeeklyView from "./weekly-view";
import { Tables } from "@/types/db";

enum CalendarView {
  // Daily = "Daily",
  Weekly = "Weekly",
  Monthly = "Monthly",
}

export type CalendarEvent = {
  content: Tables<"content"> & {
    published_content: Tables<"published_content">[];
    template: Tables<"templates"> | null;
  };
  scheduleName: string;
  title: string;
  start: Date;
  end?: Date;
  data: any;
  hasDataChanged: boolean;
  color?: string;
  previewUrls?: string[];
};

export default function FullCalendar({
  actionButtons,
  events = [],
  previewUrls = new Map<string, string[]>(),
  onEventClick,
  currentMonth,
  setCurrentMonth,
}: {
  actionButtons?: React.ReactNode[];
  events?: CalendarEvent[];
  previewUrls?: Map<string, string[]>;
  onEventClick?: (event: CalendarEvent) => void;
  currentMonth: string;
  setCurrentMonth: (month: string) => void;
}) {
  const today = startOfToday();
  const [selectedDay, setSelectedDay] = useState<Date>(today);

  const [currentWeek, setCurrentWeek] = useState({
    start: startOfWeek(today),
    end: endOfWeek(today),
  });

  const firstDayCurrentMonth = parse(currentMonth, "MMM-yyyy", new Date());

  const [currentView, setCurrentView] = useState(CalendarView.Monthly);

  function handlePrevMonthClick() {
    const firstDayPrevMonth = add(firstDayCurrentMonth, { months: -1 });
    const currMonth = format(firstDayPrevMonth, "MMM-yyyy");
    setCurrentMonth(currMonth);
  }
  function handleNextMonthClick() {
    const firstDayNextMonth = add(firstDayCurrentMonth, { months: 1 });
    const currMonth = format(firstDayNextMonth, "MMM-yyyy");
    setCurrentMonth(currMonth);
  }
  function handlePrevWeekClick() {
    const newStart = add(currentWeek.start, { weeks: -1 });
    const newEnd = add(currentWeek.end, { weeks: -1 });
    setCurrentWeek({ start: newStart, end: newEnd });
  }
  function handleNextWeekClick() {
    const newStart = add(currentWeek.start, { weeks: 1 });
    const newEnd = add(currentWeek.end, { weeks: 1 });
    setCurrentWeek({ start: newStart, end: newEnd });
  }

  function handleNextClick() {
    switch (currentView) {
      case CalendarView.Weekly:
        handleNextWeekClick();
        break;
      case CalendarView.Monthly:
        handleNextMonthClick();
        break;
    }
  }

  function handlePrevClick() {
    switch (currentView) {
      case CalendarView.Weekly:
        handlePrevWeekClick();
        break;
      case CalendarView.Monthly:
        handlePrevMonthClick();
        break;
    }
  }

  function renderCalendarView() {
    switch (currentView) {
      case CalendarView.Weekly:
        return <FullCalendarWeeklyView week={currentWeek} selectedDay={selectedDay} />;
      case CalendarView.Monthly:
        return (
          <FullCalendarMonthlyView
            events={events}
            month={currentMonth}
            previewUrls={previewUrls}
            selectedDay={selectedDay}
            onDaySelect={(day) => setSelectedDay(day)}
            onEventClick={onEventClick}
          />
        );
    }
  }
  function renderDateRange() {
    switch (currentView) {
      case CalendarView.Weekly:
        return `${format(currentWeek.start, "MMM d")} - ${format(currentWeek.end, "MMM d")}`;
      case CalendarView.Monthly:
        return format(firstDayCurrentMonth, "MMM yyyy");
    }
  }

  return (
    <div className="lg:flex lg:h-full lg:flex-col">
      <header className="flex items-center justify-between py-4 lg:flex-none">
        <div className="relative flex items-center gap-1 rounded-md md:gap-2">
          <button
            type="button"
            onClick={handlePrevClick}
            className="flex h-9 w-12 items-center justify-center rounded-l-md pr-1 text-secondary-foreground focus:relative md:w-9 md:pr-0 md:hover:bg-secondary"
          >
            <span className="sr-only">Previous</span>
            <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
          </button>
          <h1 className="text-base font-semibold leading-6 text-secondary-foreground">
            <time>{renderDateRange()}</time>
          </h1>
          <button
            type="button"
            onClick={handleNextClick}
            className="flex h-9 w-12 items-center justify-center rounded-r-md  pl-1 text-secondary-foreground focus:relative md:w-9 md:pl-0 md:hover:bg-secondary"
          >
            <span className="sr-only">Next</span>
            <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <span className="flex-1"></span>
        <div className="ml-4 flex items-center gap-2">
          {false && (
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button className="flex w-[100px] items-center gap-x-2 rounded-md bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground shadow-sm hover:bg-slate-200 dark:hover:bg-slate-600">
                  {currentView}
                  <ChevronDownIcon
                    className="-mr-1 h-4 w-4 text-secondary-foreground"
                    aria-hidden="true"
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {Object.values(CalendarView).map((view) => (
                  <DropdownMenuItem
                    onClick={() => {
                      setCurrentView(view);
                    }}
                    key={view}
                  >
                    {view}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {actionButtons}
        </div>
      </header>
      {renderCalendarView()}
    </div>
  );
}
