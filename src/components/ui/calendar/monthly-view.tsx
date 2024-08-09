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

function getCalendarDays(date = new Date()) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
}

export default function FullCalendarMonthlyView({
  month,
  selectedDay,
}: {
  month: string;
  selectedDay: Date;
}) {
  const firstDayCurrentMonth = parse(month, "MMM-yyyy", new Date());
  const days = getCalendarDays(firstDayCurrentMonth);

  return (
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
            return (
              <div
                key={day.getTime()}
                className={cn(
                  isSameMonth(day, firstDayCurrentMonth)
                    ? "bg-slate-200 dark:bg-neutral-800"
                    : "bg-slate-50  text-secondary-foreground dark:bg-neutral-600",
                  "relative px-3 py-2",
                )}
              >
                <time
                  dateTime={formattedDay}
                  className={
                    isToday(day)
                      ? "flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 font-semibold text-white"
                      : undefined
                  }
                >
                  {formattedDay.split("-").pop()?.replace(/^0/, "")}
                </time>
                {/* {day.events.length > 0 && (
          <ol className="mt-2">
            {day.events.slice(0, 2).map((event) => (
              <li key={event.id}>
                <a href={event.href} className="group flex">
                  <p className="flex-auto truncate font-medium text-secondary-foreground group-hover:text-indigo-600">
                    {event.name}
                  </p>
                  <time
                    dateTime={event.datetime}
                    className="ml-3 hidden flex-none text-secondary-foreground group-hover:text-indigo-600 xl:block"
                  >
                    {event.time}
                  </time>
                </a>
              </li>
            ))}
            {day.events.length > 2 && (
              <li className="text-secondary-foreground">+ {day.events.length - 2} more</li>
            )}
          </ol>
        )} */}
              </div>
            );
          })}
        </div>
        <div className="isolate grid w-full grid-cols-7 grid-rows-5 gap-px lg:hidden">
          {days.map((day) => {
            const isSelected = isEqual(day, selectedDay);
            const formattedDay = format(day, "yyyy-MM-dd");
            return (
              <button
                key={day.getTime()}
                type="button"
                className={cn(
                  isSameMonth(day, firstDayCurrentMonth)
                    ? "bg-slate-200 dark:bg-neutral-800"
                    : "bg-slate-50  text-secondary-foreground dark:bg-neutral-600",
                  (isSelected || isToday(day)) && "font-semibold",
                  isSelected && "text-white",
                  !isSelected && isToday(day) && "text-indigo-600",
                  !isSelected && isThisMonth(day) && !isToday(day) && "text-secondary-foreground",
                  !isSelected && !isThisMonth(day) && !isToday(day) && "text-secondary-foreground",
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
                {/* <span className="sr-only">{day.events.length} events</span>
          {day.events.length > 0 && (
            <span className="-mx-0.5 mt-auto flex flex-wrap-reverse">
              {day.events.map((event) => (
                <span
                  key={event.id}
                  className="mx-0.5 mb-1 h-1.5 w-1.5 rounded-full bg-gray-400"
                />
              ))}
            </span>
          )} */}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
