"use client";
import { CalendarDateTime } from "@internationalized/date";
import { format } from "date-fns";
import { CalendarIcon, ClockIcon } from "lucide-react";
import { useEffect, useRef, useState, RefObject } from "react";
import {
  DateValue,
  TimeValue,
  useDateSegment,
  useInteractOutside,
  useLocale,
  useTimeField,
} from "react-aria";
import {
  DateFieldState,
  DatePickerStateOptions,
  DateSegment as IDateSegment,
  useDatePickerState,
  useTimeFieldState,
} from "react-stately";
import { cn } from "../../utils";
// imports from shadcn/ui
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Toggle } from "./toggle";
import { Calendar } from "./calendar";

interface DateSegmentProps {
  segment: IDateSegment;
  state: DateFieldState;
}

function DateSegment({ segment, state }: DateSegmentProps) {
  const ref = useRef<HTMLDivElement>(null);

  const {
    segmentProps: { ...segmentProps },
  } = useDateSegment(segment, state, ref as RefObject<HTMLElement>);

  return (
    <div
      {...segmentProps}
      ref={ref}
      className={cn(
        "focus:rounded-[2px] focus:bg-accent focus:text-accent-foreground focus:outline-none",
        segment.type !== "literal" ? "px-[1px]" : "",
        segment.isPlaceholder ? "text-muted-foreground" : "",
      )}
    >
      {segment.text}
    </div>
  );
}

function TimeField({
  className,
  hasTime,
  onHasTimeChange,
  disabled,
  ...props
}: {
  className?: string;
  disabled: boolean;
  hasTime: boolean;
  onHasTimeChange: (hasTime: boolean) => void;
  value: TimeValue | null;
  onChange: (value: TimeValue) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  const { locale } = useLocale();
  const state = useTimeFieldState({
    ...props,
    locale,
  });

  useTimeField(props, state, ref as RefObject<HTMLElement>);

  return (
    <div
      className={cn(
        "mt-1 flex items-center space-x-2",
        disabled ? "cursor-not-allowed opacity-70" : "",
        className,
      )}
    >
      <Toggle
        disabled={disabled}
        pressed={hasTime}
        onPressedChange={onHasTimeChange}
        size="lg"
        variant="outline"
        aria-label="Toggle time"
      >
        <ClockIcon size="16px" />
      </Toggle>
      {hasTime && (
        <div
          ref={ref}
          className={cn(
            "inline-flex h-10 w-full flex-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            className,
          )}
        >
          {state.segments.map((segment, i) => (
            <DateSegment key={i} segment={segment} state={state} />
          ))}
        </div>
      )}
    </div>
  );
}

const dateToCalendarDateTime = (date: Date): CalendarDateTime => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // JavaScript months are 0-based
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();
  const millisecond = date.getMilliseconds();

  return new CalendarDateTime(year, month, day, hour, minute, second, millisecond);
};

type DatePickerProps = {
  value?: { date?: Date | null; hasTime: boolean };
  button?: React.ReactNode;
  onChange: (value: { date: Date; hasTime: boolean; error?: string }) => void;
  isDisabled?: boolean;
  className?: string;
  disableTimePicker?: boolean;
  disablePastDateTime?: boolean;
  placeholder?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
};
const DateTimePicker = (props: DatePickerProps) => {
  const contentRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const hasTime = props.value?.hasTime || false;

  useEffect(() => {
    if (props.disablePastDateTime) {
      onChangeWrapper(dateToCalendarDateTime(props.value?.date ?? new Date()));
    }
  }, []);

  const onChangeWrapper = (value: DateValue, newHasTime?: boolean) => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const newDate = value.toDate(timeZone);

    let error;
    if (props.disablePastDateTime && newDate.getTime() < Date.now()) {
      error = "Selected datetime must be in the future";
    }

    props.onChange({
      date: newDate,
      error,
      hasTime: newHasTime ?? hasTime,
    });
    if (props.disableTimePicker) {
      setOpen(false);
    }
  };
  const datePickerProps: DatePickerStateOptions<CalendarDateTime> = {
    value: props.value?.date ? dateToCalendarDateTime(props.value.date) : undefined,
    onChange: onChangeWrapper,
    isDisabled: props.isDisabled,
    granularity: "minute",
  };

  const state = useDatePickerState(datePickerProps);
  useInteractOutside({
    ref: contentRef as RefObject<Element>,
    onInteractOutside: (e) => {
      setOpen(false);
    },
  });

  const dateDisplayFormat = hasTime ? "MM/dd/yyyy hh:mm a" : "MM/dd/yyyy";

  return (
    <Popover open={open} onOpenChange={setOpen} aria-label="Date Time Picker">
      <PopoverTrigger asChild>
        {props.button || (
          <Button
            variant={props.variant || "outline"}
            className={cn(
              "h-12 w-full min-w-[240px] justify-start text-left",
              !props.value && "text-muted-foreground",
              props.className,
            )}
            disabled={props.isDisabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />

            {props.value?.date ? (
              format(props.value.date, dateDisplayFormat)
            ) : (
              <span>{props.placeholder || "Pick a date"}</span>
            )}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent ref={contentRef} className="w-auto" align="start">
        <Calendar
          mode="single"
          selected={props.value?.date || undefined}
          disablePastDays={props.disablePastDateTime || false}
          onSelect={(value) => {
            onChangeWrapper(dateToCalendarDateTime(value ?? new Date()));
          }}
          initialFocus
          footer={
            props.disableTimePicker ? undefined : (
              <>
                <TimeField
                  aria-label="Time Picker"
                  disabled={!props.value?.date}
                  hasTime={hasTime}
                  onHasTimeChange={(newHasTime) => {
                    onChangeWrapper(
                      dateToCalendarDateTime(props.value?.date ?? new Date()),
                      newHasTime,
                    );
                  }}
                  value={state.timeValue}
                  onChange={(value) => {
                    state.setTimeValue(value);
                  }}
                />
              </>
            )
          }
        />
      </PopoverContent>
    </Popover>
  );
};

export { DateTimePicker };
