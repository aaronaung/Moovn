import { format } from "date-fns";

export const milliToMinSecond = (milli: number): [number, number] => {
  const minutes = Math.floor(milli / 60000);
  const seconds = (milli % 60000) / 1000;
  return [minutes, seconds];
};

export const minSecondToMilli = (timestamp: [number, number]): number => {
  const milliFromMinutes = timestamp[0] * 60000;
  const milliFromSeconds = timestamp[1] * 1000;
  return milliFromMinutes + milliFromSeconds;
};

const prefixWithZero = (num: string): string => {
  return parseInt(num) < 10 ? `0${num}` : num;
};

export const fromMilliToReadableTimestamp = (milli: number): string => {
  const [min, sec] = milliToMinSecond(milli);
  return `${min.toFixed(0)}:${prefixWithZero(sec.toFixed(0))}`;
};

export const fromSecToReadableTimestamp = (seconds: number): string => {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min.toFixed(0)}:${prefixWithZero(sec.toFixed(0))}`;
};

export const userFriendlyDate = (date: Date | number | string) => {
  if (typeof date === "string") {
    return `${format(new Date(date), "MMM do yyyy h:mma")}`;
  }
  return `${format(date, "MMM do yyyy h:mma")}`;
};
