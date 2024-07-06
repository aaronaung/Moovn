// import { cn } from "@/src/utils";
// import { format, isBefore, isSameMonth, isToday, startOfDay } from "date-fns";
// import { useDrop } from "react-dnd";
// import { Tables } from "@/types/db.extension";

// type CalendarV2DayProps = {
//   day: Date;
//   onDaySelect: (date: Date) => void;
//   isSelected?: boolean;
//   firstDayCurrentMonth: Date;
//   onServiceDrop?: (item: Tables<"services">, day: Date) => void;
// };
// export default function CalendarV2Day({
//   day,
//   onDaySelect,
//   isSelected,
//   firstDayCurrentMonth,
//   onServiceDrop,
// }: CalendarV2DayProps) {
//   const [{ isOver, canDrop }, drop] = useDrop(
//     () => ({
//       accept: "",
//       canDrop: () => true,
//       drop: (item: Tables<"services">) => {
//         onServiceDrop?.(item, day);
//       },
//       collect: (monitor) => ({
//         isOver: Boolean(monitor.isOver()),
//         canDrop: Boolean(monitor.canDrop()),
//       }),
//     }),
//     [],
//   );

//   const inThePast = isBefore(day, startOfDay(new Date()));

//   return (
//     <button
//       type="button"
//       ref={drop}
//       onClick={() => onDaySelect(day)}
//       className={cn(
//         isSelected && "text-white",
//         !isSelected && isToday(day) && "text-red-500",
//         !isSelected &&
//           !isToday(day) &&
//           isSameMonth(day, firstDayCurrentMonth) &&
//           "text-gray-900",
//         !isSelected &&
//           !isToday(day) &&
//           !isSameMonth(day, firstDayCurrentMonth) &&
//           "text-gray-400",
//         isSelected && isToday(day) && "bg-red-500",
//         isSelected && !isToday(day) && "bg-gray-900",
//         !isSelected && !isOver && "hover:bg-gray-200",
//         (isSelected || isToday(day)) && "font-semibold",
//         "mx-auto flex h-8 w-8 items-center justify-center rounded-full",
//         isOver && canDrop && "cursor-pointer bg-green-800",
//         !isOver && canDrop && "bg-green-50 text-secondary-foreground",
//         inThePast && "bg-secondary text-muted-foreground hover:bg-secondary",
//       )}
//       disabled={inThePast}
//     >
//       <time dateTime={format(day, "yyyy-MM-dd")}>{format(day, "d")}</time>
//     </button>
//   );
// }
