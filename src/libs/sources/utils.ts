import { ScheduleData } from "./common";
import { isArray, isPlainObject } from "lodash";

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
  internalTransform(input.schedules, "schedules", result);
  return result;
};
