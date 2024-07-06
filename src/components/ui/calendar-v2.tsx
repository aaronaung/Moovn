// "use client";

// import { cn } from "@/src/utils";
// import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
// import {
//   add,
//   eachDayOfInterval,
//   endOfMonth,
//   format,
//   getDay,
//   isEqual,
//   parse,
//   startOfToday,
// } from "date-fns";
// import { useState } from "react";
// import CalendarV2Day from "./calendar-v2-day";

// const colStartClasses = [
//   "",
//   "col-start-2",
//   "col-start-3",
//   "col-start-4",
//   "col-start-5",
//   "col-start-6",
//   "col-start-7",
// ];

// type CalendarV2Props = {
//   onDateSelect?: (date: Date) => void;
//   defaultSelectedDay?: Date;
//   className?: string;
// };
// export default function CalendarV2({
//   onDateSelect,
//   defaultSelectedDay,
//   className,
// }: CalendarV2Props) {
//   const today = startOfToday();
//   const [selectedDay, setSelectedDay] = useState(defaultSelectedDay || today);
//   const [currentMonth, setCurrentMonth] = useState(
//     format(defaultSelectedDay || today, "MMM-yyyy"),
//   );

//   const firstDayCurrentMonth = parse(currentMonth, "MMM-yyyy", new Date());
//   const days = eachDayOfInterval({
//     start: firstDayCurrentMonth,
//     end: endOfMonth(firstDayCurrentMonth),
//   });

//   function handlePrevMonthClick() {
//     const firstDayPrevMonth = add(firstDayCurrentMonth, { months: -1 });
//     const currMonth = format(firstDayPrevMonth, "MMM-yyyy");
//     setCurrentMonth(currMonth);
//   }

//   function handleNextMonthClick() {
//     const firstDayNextMonth = add(firstDayCurrentMonth, { months: 1 });
//     const currMonth = format(firstDayNextMonth, "MMM-yyyy");
//     setCurrentMonth(currMonth);
//   }

//   function handleDateSelect(date: Date) {
//     setSelectedDay(date);
//     onDateSelect?.(date);
//   }

//   return (
//     <div className={cn(className, "rounded-lg border border-slate-200 p-4")}>
//       <div className="flex items-center px-3 pt-2">
//         <h2 className="flex-auto font-semibold text-gray-900">
//           {format(firstDayCurrentMonth, "MMMM yyyy")}
//         </h2>
//         <button
//           type="button"
//           onClick={handlePrevMonthClick}
//           className="-my-1.5 flex flex-none items-center justify-center p-1.5 text-gray-400 hover:text-gray-500"
//         >
//           <span className="sr-only">Previous month</span>
//           <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
//         </button>
//         <button
//           onClick={handleNextMonthClick}
//           type="button"
//           className="-my-1.5 -mr-1.5 ml-2 flex flex-none items-center justify-center p-1.5 text-gray-400 hover:text-gray-500"
//         >
//           <span className="sr-only">Next month</span>
//           <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
//         </button>
//       </div>
//       <div className="mt-10 grid grid-cols-7 text-center text-xs leading-6 text-gray-500">
//         <div>S</div>
//         <div>M</div>
//         <div>T</div>
//         <div>W</div>
//         <div>T</div>
//         <div>F</div>
//         <div>S</div>
//       </div>
//       <div className="mt-2 grid grid-cols-7 text-sm">
//         {days.map((day, dayIdx) => (
//           <div
//             key={day.toString()}
//             className={cn(
//               dayIdx === 0 && colStartClasses[getDay(day)],
//               "py-1.5",
//             )}
//           >
//             <CalendarV2Day
//               day={day}
//               isSelected={isEqual(day, selectedDay)}
//               firstDayCurrentMonth={firstDayCurrentMonth}
//               onDaySelect={handleDateSelect}
//             />
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }
