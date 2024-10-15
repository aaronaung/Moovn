import { Tables } from "@/types/db";
import { format, parse, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

export function generateCaption(template: string, schedule?: { [key: string]: string }): string {
  if (!schedule) {
    return template;
  }

  // First, replace all keys with their values or placeholders
  let result = template.replace(/{(.*?)}/g, (match, key) => {
    let [actualKey, dateFormat] = key.split("|");
    actualKey = actualKey.trim();

    if (actualKey in schedule) {
      if (dateFormat) {
        try {
          const date = parseISO(schedule[actualKey]);
          return format(date, dateFormat.trim());
        } catch (error) {
          console.error(`Error formatting date: ${error}`);
          return schedule[actualKey]; // Fallback to the original value
        }
      } else {
        return schedule[actualKey];
      }
    }
    return "\0"; // Use null character as placeholder for missing keys
  });

  // Remove lines containing only the null character placeholder
  // Preserve the newline if the next line is not empty
  result = result.replace(
    /^([^\S\n]*)\0[^\S\n]*$\n?(?=(.|\n))/gm,
    (match, leadingSpace, nextLine) => {
      return nextLine.trim() ? "\n" : "";
    },
  );

  // Remove any remaining null characters
  result = result.replace(/\0/g, "");

  // Remove any consecutive newlines more than two
  result = result.replace(/\n{3,}/g, "\n\n");

  return result.trim(); // Trim any leading or trailing whitespace
}

// scheduleRange is a string that represents the range of the schedule. e.g. "2022-01-01_2022-01-31" or "2022-01-01" if it's a single day.
export const getContentIdbKey = (
  sourceId: string,
  scheduleRange: string,
  templateItem: Tables<"template_items">,
) => `${sourceId}/${scheduleRange}/${templateItem.id}`;

export const deconstructContentIdbKey = (contentIdbKey: string) => {
  const [sourceId, range, templateId] = contentIdbKey.split("/");
  return { sourceId, range, templateId };
};

export const getRangeStart = (range: string) =>
  parse(range.split("_")[0], "yyyy-MM-dd", new Date());

export const parseRange = (range: string) => {
  const [from, to] = range.split("_");
  return {
    from: parse(from, "yyyy-MM-dd", new Date()),
    to: parse(to ?? from, "yyyy-MM-dd", new Date()),
  };
};

export const getScheduleName = (range: string, contentId: string) => `${range}_${contentId}`; // AWS EventBridge doesn't allow slashes in rule names.

export const deconstructScheduleName = (scheduleName: string) => {
  const split = scheduleName.split("_");
  return {
    range: split.splice(0, split.length - 1).join("_"),
    contentId: split[split.length - 1],
  };
};

export const fromAtScheduleExpressionToDate = (expression: string) => {
  const date = expression.match(/at\((.*)\)/)?.[1];
  return date ? new Date(`${date}.000Z`) : null;
};

export const atScheduleExpression = (date: Date) =>
  `at(${formatInTimeZone(date, "UTC", "yyyy-MM-dd'T'HH:mm:ss")})`; // toISOString() includes milli seconds which is not supported by eventbridge
