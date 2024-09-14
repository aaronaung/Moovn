import { cn } from "@/src/utils";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isEqual,
  isSameMonth,
  isThisMonth,
  isToday,
  parse,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { CalendarEvent } from "./full-calendar";
import { ClockIcon, InformationCircleIcon } from "@heroicons/react/24/outline";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Tooltip, TooltipContent, TooltipTrigger } from "../tooltip";
import Image from "../image";

const ImageViewer = dynamic(() => import("react-viewer"), { ssr: false });

function getCalendarDays(date = new Date()) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
}

export function groupEventsByStartDate(events: CalendarEvent[]): Record<string, CalendarEvent[]> {
  return events.reduce(
    (groups, event) => {
      const dateKey = format(event.start, "yyyy-MM-dd");
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(event);
      return groups;
    },
    {} as Record<string, CalendarEvent[]>,
  );
}

export default function FullCalendarMonthlyView({
  month,
  selectedDay,
  previewUrls,
  onDaySelect,
  events,
  onEventClick,
}: {
  month: string;
  selectedDay: Date;
  previewUrls: Map<string, string[]>;
  onDaySelect: (day: Date) => void;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
}) {
  const firstDayCurrentMonth = parse(month, "MMM-yyyy", new Date());
  const days = getCalendarDays(firstDayCurrentMonth);
  const [imageViewerState, setImageViewerState] = useState<{
    isOpen: boolean;
    previewUrl?: string;
  }>({
    isOpen: false,
  });

  const eventsByDay = groupEventsByStartDate(events);
  const eventsOnSelectedDay = (eventsByDay[selectedDay.toISOString().split("T")[0]] || []).sort(
    (a, b) => b.start.getTime() - a.start.getTime(),
  );

  return (
    <>
      <ImageViewer
        visible={imageViewerState.isOpen}
        onMaskClick={() =>
          setImageViewerState((prev) => ({
            ...prev,
            isOpen: false,
          }))
        }
        images={[{ src: imageViewerState.previewUrl || "", alt: "Design" }]}
        onClose={() =>
          setImageViewerState((prev) => ({
            ...prev,
            isOpen: false,
          }))
        }
      />
      <div className="h-full lg:flex">
        <div className="shadow ring-1 ring-black ring-opacity-5 lg:flex lg:flex-auto lg:flex-col">
          <div className="grid grid-cols-7 gap-px border-b border-gray-300 bg-secondary text-center text-xs font-semibold leading-6 text-secondary-foreground dark:border-gray-600 lg:flex-none">
            <div className="bg-secondary py-2">
              M<span className="sr-only sm:not-sr-only">on</span>
            </div>
            <div className="bg-secondary py-2">
              T<span className="sr-only sm:not-sr-only">ue</span>
            </div>
            <div className="bg-secondary py-2">
              W<span className="sr-only sm:not-sr-only">ed</span>
            </div>
            <div className="bg-secondary py-2">
              T<span className="sr-only sm:not-sr-only">hu</span>
            </div>
            <div className="bg-secondary py-2">
              F<span className="sr-only sm:not-sr-only">ri</span>
            </div>
            <div className="bg-secondary py-2">
              S<span className="sr-only sm:not-sr-only">at</span>
            </div>
            <div className="bg-secondary py-2">
              S<span className="sr-only sm:not-sr-only">un</span>
            </div>
          </div>
          <div className="flex bg-secondary text-xs leading-6 text-secondary-foreground dark:bg-neutral-700 lg:flex-auto">
            <div className="hidden w-full lg:grid lg:grid-cols-7 lg:grid-rows-5 lg:gap-px">
              {days.map((day) => {
                const formattedDay = format(day, "yyyy-MM-dd");
                const eventsOnDay = (eventsByDay[formattedDay] ?? []).sort(
                  (a, b) => a.start.getTime() - b.start.getTime(),
                );
                return (
                  <div
                    key={day.getTime()}
                    onClick={() => onDaySelect(day)}
                    className={cn(
                      isSameMonth(day, firstDayCurrentMonth)
                        ? "bg-slate-200 dark:bg-neutral-800"
                        : "bg-slate-50  text-secondary-foreground dark:bg-neutral-600",
                      "group relative cursor-pointer px-2 py-2",
                    )}
                  >
                    <time
                      dateTime={formattedDay}
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full",
                        isToday(day)
                          ? " bg-indigo-600 font-semibold text-white"
                          : isEqual(day, selectedDay)
                          ? " bg-secondary-foreground font-semibold text-secondary"
                          : undefined,
                        !isEqual(day, selectedDay) &&
                          "group-hover:bg-secondary-foreground group-hover:text-secondary group-hover:opacity-50",
                      )}
                    >
                      {formattedDay.split("-").pop()?.replace(/^0/, "")}
                    </time>
                    {eventsOnDay.length > 0 && (
                      <ol className="mt-2 space-y-0.5">
                        {eventsOnDay.slice(0, 3).map((event, index) => {
                          const time = event.start.toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          });
                          return (
                            <Tooltip key={index}>
                              <TooltipTrigger className="w-full">
                                <li
                                  className="group/event-li w-full"
                                  key={index}
                                  onClick={() => onEventClick?.(event)}
                                >
                                  <div
                                    className={cn(
                                      `flex w-full cursor-pointer items-center gap-1 rounded-full bg-secondary px-1.5 dark:bg-neutral-700`,
                                      event.hasDataChanged && "text-orange-500",
                                    )}
                                  >
                                    {event.hasDataChanged && (
                                      <InformationCircleIcon className="h-4 w-4 " />
                                    )}
                                    <p
                                      className={cn(
                                        "line-clamp-1 flex-auto text-left font-medium text-secondary-foreground group-hover/event-li:text-indigo-600",
                                        event.hasDataChanged &&
                                          "text-orange-500 group-hover/event-li:text-orange-500",
                                      )}
                                    >
                                      {event.title}
                                    </p>
                                    <time
                                      dateTime={event.start.toISOString()}
                                      className={cn(
                                        "ml-3 hidden flex-none text-secondary-foreground group-hover/event-li:text-indigo-600 xl:block",
                                        event.hasDataChanged &&
                                          "text-orange-500 group-hover/event-li:text-orange-500",
                                      )}
                                    >
                                      {time}
                                    </time>
                                  </div>
                                </li>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="w-full cursor-pointer">
                                <p
                                  className={cn(
                                    "font-semibold",
                                    event.hasDataChanged && "mb-1 text-orange-500",
                                  )}
                                >
                                  {event.title} {time}
                                </p>
                                {event.hasDataChanged && (
                                  <div className="flex items-center gap-1">
                                    <p className="text-xs text-orange-500">
                                      The schedule data has changed. Review the content before it
                                      gets published.
                                    </p>
                                  </div>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                        {eventsOnDay.length > 3 && (
                          <li className="text-secondary-foreground">
                            + {eventsOnDay.length - 3} more
                          </li>
                        )}
                      </ol>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="isolate grid w-full grid-cols-7 grid-rows-5 gap-px lg:hidden">
              {days.map((day) => {
                const isSelected = isEqual(day, selectedDay);
                const formattedDay = format(day, "yyyy-MM-dd");
                const eventsOnDay = (eventsByDay[formattedDay] ?? []).sort(
                  (a, b) => a.start.getTime() - b.start.getTime(),
                );
                return (
                  <button
                    key={day.getTime()}
                    type="button"
                    onClick={() => onDaySelect(day)}
                    className={cn(
                      isSameMonth(day, firstDayCurrentMonth)
                        ? "bg-slate-200 dark:bg-neutral-800"
                        : "bg-slate-50  text-secondary-foreground dark:bg-neutral-600",
                      (isSelected || isToday(day)) && "font-semibold",
                      isSelected && "text-white",
                      !isSelected && isToday(day) && "text-indigo-600",
                      !isSelected &&
                        isThisMonth(day) &&
                        !isToday(day) &&
                        "text-secondary-foreground",
                      !isSelected &&
                        !isThisMonth(day) &&
                        !isToday(day) &&
                        "text-secondary-foreground",
                      "flex h-14 flex-col px-3 py-2 hover:bg-gray-100 focus:z-10",
                    )}
                  >
                    <time
                      dateTime={formattedDay}
                      className={cn(
                        isSelected && "flex h-6 w-6 items-center justify-center rounded-full",
                        isSelected && isToday(day) && "bg-indigo-600",
                        isSelected && !isToday(day) && "bg-gray-900",
                        "ml-auto",
                      )}
                    >
                      {formattedDay.split("-").pop()?.replace(/^0/, "")}
                    </time>
                    <span className="sr-only">{eventsOnDay.length} events</span>
                    {eventsOnDay.length > 0 && (
                      <span className="-mx-0.5 mt-auto flex flex-wrap-reverse">
                        {eventsOnDay.map((event, index) => (
                          <span
                            key={index}
                            className="mx-0.5 mb-1 h-1.5 w-1.5 rounded-full bg-gray-400"
                          />
                        ))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="w-full shrink-0 py-4 lg:ml-4 lg:w-[220px] lg:py-0">
          <p className="mb-4 font-medium">{format(selectedDay, "MMM, do")}</p>
          {eventsOnSelectedDay.length > 0 ? (
            <ol className="divide-y divide-slate-200 overflow-hidden rounded-lg bg-secondary text-sm shadow ring-1 ring-black ring-opacity-5 dark:divide-gray-600 lg:text-xs">
              {eventsOnSelectedDay.map((event, index) => (
                <li
                  key={index}
                  onClick={() => {
                    onEventClick?.(event);
                  }}
                  className="group flex cursor-pointer p-3 pr-6 focus-within:bg-secondary hover:bg-secondary"
                >
                  <div className="flex-auto">
                    <div className="flex items-center gap-1">
                      <p
                        className={cn(
                          "line-clamp-2 font-semibold text-secondary-foreground",
                          event.hasDataChanged && "text-orange-500",
                        )}
                      >
                        {event.title}
                      </p>
                    </div>
                    <time
                      dateTime={event.start.toISOString()}
                      className={cn(
                        "mt-2 flex items-center text-secondary-foreground",
                        event.hasDataChanged && "text-orange-500",
                      )}
                    >
                      <ClockIcon
                        className={cn(
                          "mr-2 h-5 w-5 text-gray-400",
                          event.hasDataChanged && "text-orange-500",
                        )}
                        aria-hidden="true"
                      />
                      {event.start.toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                  <div>
                    {previewUrls.has(event.contentId) && (
                      <Image
                        className="h-[50px] w-[50px] rounded-sm object-contain"
                        src={previewUrls.get(event.contentId)?.[0]}
                        alt={"preview"}
                      />
                    )}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing scheduled on this day</p>
          )}
        </div>
      </div>
    </>
  );
}
