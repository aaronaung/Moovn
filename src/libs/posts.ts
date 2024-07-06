import { format, parseISO } from "date-fns";

export function renderCaption(template: string, values?: { [key: string]: string }): string {
  if (!values) {
    return template;
  }
  return template.replace(/{(.*?)}/g, (match, key) => {
    let [actualKey, dateFormat] = key.split("|");
    actualKey = actualKey.trim();

    if (actualKey in values) {
      if (dateFormat) {
        // If dateFormat exists, format the date value
        try {
          const date = parseISO(values[actualKey]);
          return format(date, dateFormat.trim());
        } catch (error) {
          console.error(`Error formatting date: ${error}`);
          return values[actualKey]; // Fallback to the original value
        }
      } else {
        return values[actualKey];
      }
    }
    return match;
  });
}
