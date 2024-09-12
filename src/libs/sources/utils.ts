import {
  addWeeks,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isWithinInterval,
  min,
  startOfWeek,
} from "date-fns";
import { ScheduleData } from ".";
import { isArray, isPlainObject } from "lodash";
import { SourceDataView } from "@/src/consts/sources";

const testData: ScheduleData = {
  schedules: [
    {
      date: "2022-01-01",
      events: [
        {
          staff_members: [
            {
              name: "John Doe",
              profile_photo: "https://example.com/john-doe.jpg",
            },
          ],
          name: "Event 1",
          start_at: "2022-01-01T08:00:00",
          end_at: "2022-01-01T09:00:00",
        },
      ],
    },
  ],
};
const resultWeWant = {
  "schedules#1": {
    date: "2022-01-01",
    "events#1": {
      "staff_members#1": {
        name: "John Doe",
        profile_photo: "https://example.com/john-doe.jpg",
      },
      name: "Event 1",
      start_at: "2022-01-01T08:00:00",
      end_at: "2022-01-01T09:00:00",
    },
  },
};

export const transformSchedule = (input?: ScheduleData) => {
  if (!input) {
    return {};
  }

  const internalTransform = (value: any, key: string): any => {
    if (isArray(value)) {
      const result: { [key: string]: any } = {};
      for (let i = 0; i < value.length; i++) {
        const newKey = `${key}#${i + 1}`;
        result[newKey] = internalTransform(value[i], key);
      }
      return result;
    } else if (isPlainObject(value)) {
      const result: { [key: string]: any } = {};
      for (const [k, v] of Object.entries(value)) {
        if (isArray(v)) {
          const result = { ...value, ...internalTransform(v, k) };
          delete result[k];
          return result;
        } else {
          result[k] = internalTransform(value[k], k);
        }
      }
      return result;
    } else {
      return value;
    }
  };

  return internalTransform(input, "schedules");
};

export const flattenSchedule = (input?: ScheduleData) => {
  if (!input) {
    return {};
  }

  const internalTransform = (value: any, key: string, result: any): any => {
    if (isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const newKey = `${key}#${i + 1}`;
        internalTransform(value[i], newKey, result);
      }
    } else if (isPlainObject(value)) {
      for (const [k, v] of Object.entries(value)) {
        const newKey = `${key}.${k}`;
        internalTransform(v, newKey, result);
      }
    } else {
      result[key] = value;
    }
  };
  const result = {};
  internalTransform(input.day, "day", result);
  return result;
};

export const organizeScheduleDataByView = (
  view: string,
  scheduleData: ScheduleData,
  scheduleRange?: { from: Date; to: Date }, // only used for weekly view
) => {
  console.log("calling organizeScheduleByDataView", {
    view,
    scheduleData,
    scheduleRange,
  });
  const organizedSchedule: { [key: string]: any } = {};

  // Helper function to get the start and end of a week
  switch (view) {
    case SourceDataView.Daily:
      for (const key in scheduleData) {
        const keySplit = key.split(".");
        const dayNumberInKey = parseInt(keySplit[0].split("#")[1]);
        const date = scheduleData[`day#${dayNumberInKey}.date`];

        const dailyKey = format(date ? new Date(date) : new Date(), "yyyy-MM-dd");

        organizedSchedule[dailyKey] = {
          ...(organizedSchedule[dailyKey] || {}),
          // Replace the day number with 1
          [key.replaceAll(`day#${dayNumberInKey}.`, "day#1.")]: scheduleData[key],
        };
      }
      break;
    case SourceDataView.Weekly:
      const weeklyRanges: { start: Date; end: Date }[] = [];
      const start = scheduleRange?.from ?? new Date();
      const end = scheduleRange?.to ?? new Date();

      let tempStart = start;
      let tempEnd: Date;
      while (isBefore(tempStart, end)) {
        tempEnd = min([endOfWeek(tempStart), end]);
        weeklyRanges.push({ start: tempStart, end: tempEnd });
        tempStart = addWeeks(startOfWeek(tempStart), 1);
      }

      if (weeklyRanges.length === 0) {
        break;
      }

      let weekIndex = 0;
      let lastDayNumberBeforeWeekSwitch = 0;
      for (const key in scheduleData) {
        const keySplit = key.split(".");
        const dayNumberInKey = parseInt(keySplit[0].split("#")[1]);
        const date = scheduleData[`day#${dayNumberInKey}.date`];

        let weeklyRange = weeklyRanges[weekIndex] ?? {};
        if (isAfter(new Date(date), weeklyRange.end)) {
          weekIndex++;
          lastDayNumberBeforeWeekSwitch = dayNumberInKey - 1;
        }
        weeklyRange = weeklyRanges[weekIndex];
        if (!weeklyRange) {
          continue;
        }
        const weeklyKey = `${format(weeklyRange.start, "yyyy-MM-dd")}_${format(
          weeklyRanges[weekIndex].end,
          "yyyy-MM-dd",
        )}`;
        const dailyKey = key.replaceAll(
          `day#${dayNumberInKey}.`,
          `day#${dayNumberInKey - lastDayNumberBeforeWeekSwitch}.`,
        );
        organizedSchedule[weeklyKey] = {
          ...(organizedSchedule[weeklyKey] || {}),
          [dailyKey]: scheduleData[key],
        };
      }
      break;
  }
  return organizedSchedule;
};

export const extractScheduleDataWithinRange = (range: string, dailyEvents: ScheduleData) => {
  const [rangeStart, rangeEnd] = range.split("_");
  let result: { [key: string]: any } = {};
  if (!rangeEnd) {
    result = dailyEvents[rangeStart];
  } else {
    let dayCtr = 1;
    for (const day in dailyEvents) {
      if (
        isWithinInterval(new Date(day), {
          start: new Date(rangeStart),
          end: new Date(rangeEnd),
        })
      ) {
        for (const key in dailyEvents[day]) {
          const newKey = key.replace(`day#1.`, `day#${dayCtr}.`);
          result[newKey] = dailyEvents[day][key];
        }
        dayCtr++;
      }
    }
  }
  return result;
};
