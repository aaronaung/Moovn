"use client";

import { CalendarIcon } from "lucide-react";
import React, { RefObject, useRef, useState } from "react";
import { DateValue, useButton, useDatePicker, useInteractOutside } from "react-aria";
import { DatePickerStateOptions, useDatePickerState } from "react-stately";
import { cn } from "@/src/utils";
import { Button } from "../button";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";
import { Calendar } from "./calendar";
import { DateField } from "./date-field";
import { TimeField } from "./time-field";

function useForwardedRef<T>(ref: React.ForwardedRef<T>) {
  const innerRef = React.useRef<T>(null);

  React.useEffect(() => {
    if (!ref) return;
    if (typeof ref === "function") {
      ref(innerRef.current);
    } else {
      ref.current = innerRef.current;
    }
  });

  return innerRef;
}

const DateTimePicker = React.forwardRef<HTMLDivElement, DatePickerStateOptions<DateValue>>(
  (props, forwardedRef) => {
    const ref = useForwardedRef(forwardedRef);
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const contentRef = useRef<HTMLDivElement | null>(null);

    const [open, setOpen] = useState(false);

    const state = useDatePickerState(props);
    const {
      groupProps,
      fieldProps,
      buttonProps: _buttonProps,
      dialogProps,
      calendarProps,
    } = useDatePicker(props, state, ref as RefObject<Element>);
    const { buttonProps } = useButton(_buttonProps, buttonRef as RefObject<Element>);
    useInteractOutside({
      ref: contentRef as RefObject<Element>,
      onInteractOutside: (e) => {
        setOpen(false);
      },
    });

    return (
      <div
        {...groupProps}
        ref={ref}
        className={cn(
          groupProps.className,
          "flex items-center rounded-md ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        )}
      >
        <DateField {...fieldProps} />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              {...buttonProps}
              variant="outline"
              className="rounded-l-none"
              disabled={props.isDisabled}
              onClick={() => setOpen(true)}
            >
              <CalendarIcon className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent ref={contentRef} className="w-full">
            <div {...dialogProps} className="space-y-3">
              <Calendar {...calendarProps} />
              {!!state.hasTime && (
                <TimeField value={state.timeValue} onChange={state.setTimeValue} />
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  },
);

DateTimePicker.displayName = "DateTimePicker";

export { DateTimePicker };
