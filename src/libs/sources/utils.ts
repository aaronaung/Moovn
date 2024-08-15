import { addWeeks, endOfWeek, format, isAfter, isBefore, min, startOfWeek } from "date-fns";
import { ScheduleData } from "./common";
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

export const transformScheduleV2 = (input?: ScheduleData) => {
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
  scheduleRange: { from: Date; to: Date },
  scheduleData: ScheduleData,
) => {
  const organizedSchedule: { [key: string]: any } = {};

  // Helper function to get the start and end of a week
  switch (view) {
    case SourceDataView.Daily:
      for (const key in scheduleData) {
        const keySplit = key.split(".");
        const dayNumberInKey = parseInt(keySplit[0].split("#")[1]);
        const date = scheduleData[`day#${dayNumberInKey}.date`];

        const dailyKey = format(new Date(date), "yyyy-MM-dd");

        organizedSchedule[dailyKey] = {
          ...(organizedSchedule[dailyKey] || {}),
          // Replace the day number with 1
          [key.replaceAll(`day#${dayNumberInKey}.`, "day#1.")]: scheduleData[key],
        };
      }
      break;
    case SourceDataView.Weekly:
      const weeklyRanges: { start: Date; end: Date }[] = [];
      const start = new Date(scheduleRange.from);
      const end = new Date(scheduleRange.to);

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

        const weekRange = weeklyRanges[weekIndex] ?? {};
        if (isAfter(new Date(date), weekRange.end)) {
          weekIndex++;
          lastDayNumberBeforeWeekSwitch = dayNumberInKey - 1;
        }
        const weeklyKey = `${format(weeklyRanges[weekIndex].start, "yyyy-MM-dd")} - ${format(
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
