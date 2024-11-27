import { createLogger, format, transports } from "winston";

const { combine, timestamp, json } = format;

// Helper to convert Sets and Maps to plain objects/arrays for logging
const convertMetaForLogging = (meta?: Record<string, any>) => {
  if (!meta) return {};

  const converted = { ...meta };
  for (const [key, value] of Object.entries(converted)) {
    if (value instanceof Set) {
      converted[key] = Array.from(value);
    } else if (value instanceof Map) {
      converted[key] = Object.fromEntries(value);
    }
  }
  return converted;
};

const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: combine(timestamp(), json()),
  transports: [new transports.Console()],
  defaultMeta: {
    service: "moovn-lambda",
  },
});

export const log = {
  info: (message: string, meta?: Record<string, any>) => {
    logger.info(message, convertMetaForLogging(meta));
  },
  error: (message: string, meta?: Record<string, any>) => {
    logger.error(message, convertMetaForLogging(meta));
  },
  warn: (message: string, meta?: Record<string, any>) => {
    logger.warn(message, convertMetaForLogging(meta));
  },
  debug: (message: string, meta?: Record<string, any>) => {
    logger.debug(message, convertMetaForLogging(meta));
  },
};
