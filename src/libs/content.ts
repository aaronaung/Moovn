import { Tables } from "@/types/db";
import { SupabaseClient } from "@supabase/supabase-js";
import { format, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { BUCKETS } from "../consts/storage";
import { signUrl } from "./storage";

export function renderCaption(template: string, schedule?: { [key: string]: string }): string {
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

// scheduleRange is a string that represents the range of the schedule. e.g. "2022-01-01 - 2022-01-31" or "2022-01-01" if it's a single day.
export const getContentPath = (scheduleRange: string, template: Tables<"templates">) =>
  `${template.owner_id}/${scheduleRange}/${template.id}`;

export const desconstructScheduleName = (scheduleName: string) => {
  const [range, templateId] = scheduleName.split("_");
  return { range, templateId };
};

export const fromAtScheduleExpressionToDate = (expression: string) => {
  const date = expression.match(/at\((.*)\)/)?.[1];
  return date ? new Date(`${date}.000Z`) : null;
};

export const atScheduleExpression = (date: Date) =>
  `at(${formatInTimeZone(date, "UTC", "yyyy-MM-dd'T'HH:mm:ss")})`; // toISOString() includes milli seconds which is not supported by eventbridge

export const getContentPreviewUrls = async (contentPath: string, client: SupabaseClient) => {
  const { data, error } = await client.storage.from(BUCKETS.scheduledContent).list(contentPath);
  if (error) {
    throw new Error(error.message);
  }
  if (data.length === 0) {
    // The content is a single image.
    const signedUrl = await signUrl({
      bucket: BUCKETS.scheduledContent,
      client,
      objectPath: contentPath,
    });
    return [signedUrl];
  }
  // The content is a directory.
  return await Promise.all(
    data.map(async (file) =>
      signUrl({
        bucket: BUCKETS.scheduledContent,
        client,
        objectPath: `${contentPath}/${file.name}`,
      }),
    ),
  );
};
