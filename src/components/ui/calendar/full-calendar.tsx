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

enum CalendarView {
  // Daily = "Daily",
  Weekly = "Weekly",
  Monthly = "Monthly",
}

export default function FullCalendar({ actionButtons }: { actionButtons?: React.ReactNode[] }) {
  const today = startOfToday();

  const [currentMonth, setCurrentMonth] = useState(format(today, "MMM-yyyy"));
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
        return <FullCalendarWeeklyView week={currentWeek} selectedDay={today} />;
      case CalendarView.Monthly:
        return <FullCalendarMonthlyView month={currentMonth} selectedDay={today} />;
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
      <header className="flex items-center justify-between border-b border-secondary py-4 lg:flex-none">
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
          {actionButtons}
        </div>
      </header>
      {renderCalendarView()}

      {/* {(selectedDay?.events || []).length > 0 && (
        <div className="px-4 py-10 sm:px-6 lg:hidden">
          <ol className="divide-y divide-gray-100 overflow-hidden rounded-lg bg-secondary text-sm shadow ring-1 ring-black ring-opacity-5 dark:divide-gray-600">
            {(selectedDay?.events || []).map((event) => (
              <li
                key={event.id}
                className="group flex p-4 pr-6 focus-within:bg-gray-50 hover:bg-gray-50"
              >
                <div className="flex-auto">
                  <p className="font-semibold text-secondary-foreground">{event.name}</p>
                  <time
                    dateTime={event.datetime}
                    className="mt-2 flex items-center text-secondary-foreground"
                  >
                    <ClockIcon className="mr-2 h-5 w-5 text-gray-400" aria-hidden="true" />
                    {event.time}
                  </time>
                </div>
                <a
                  href={event.href}
                  className="ml-6 flex-none self-center rounded-md bg-secondary px-3 py-2 font-semibold text-secondary-foreground opacity-0 shadow-sm ring-1 ring-inset ring-gray-300 hover:ring-gray-400 focus:opacity-100 group-hover:opacity-100"
                >
                  Edit<span className="sr-only">, {event.name}</span>
                </a>
              </li>
            ))}
          </ol>
        </div>
      )} */}
    </div>
  );
}
