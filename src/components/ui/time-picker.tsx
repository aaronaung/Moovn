"use client";

import * as React from "react";
import { TimePickerInput } from "./time-picker-input";
import { TimePeriodSelect } from "./time-picker-period-select";
import { Period } from "./time-picker-utils";

interface TimePickerDemoProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  hideSeconds?: boolean;
}

export function TimePicker({ date, setDate, hideSeconds = false }: TimePickerDemoProps) {
  const [period, setPeriod] = React.useState<Period>("AM");

  const minuteRef = React.useRef<HTMLInputElement>(null);
  const hourRef = React.useRef<HTMLInputElement>(null);
  const secondRef = React.useRef<HTMLInputElement>(null);
  const periodRef = React.useRef<HTMLButtonElement>(null);

  return (
    <div className="flex items-end gap-1">
      <div className="grid gap-1 text-center">
        {/* <Label htmlFor="hours" className="text-xs">
          Hours
        </Label> */}
        <TimePickerInput
          picker="12hours"
          period={period}
          date={date}
          setDate={setDate}
          ref={hourRef}
          onRightFocus={() => minuteRef.current?.focus()}
        />
      </div>
      <div className="grid gap-1 text-center">
        {/* <Label htmlFor="minutes" className="text-xs">
          Minutes
        </Label> */}
        <TimePickerInput
          picker="minutes"
          id="minutes12"
          date={date}
          setDate={setDate}
          ref={minuteRef}
          onLeftFocus={() => hourRef.current?.focus()}
          onRightFocus={() => secondRef.current?.focus()}
        />
      </div>
      {!hideSeconds && (
        <div className="grid gap-1 text-center">
          {/* <Label htmlFor="seconds" className="text-xs">
          Seconds
        </Label> */}
          <TimePickerInput
            picker="seconds"
            id="seconds12"
            date={date}
            setDate={setDate}
            ref={secondRef}
            onLeftFocus={() => minuteRef.current?.focus()}
            onRightFocus={() => periodRef.current?.focus()}
          />
        </div>
      )}
      <div className="grid gap-1 text-center">
        {/* <Label htmlFor="period" className="text-xs">
          Period
        </Label> */}
        <TimePeriodSelect
          period={period}
          setPeriod={setPeriod}
          date={date}
          setDate={setDate}
          ref={periodRef}
          onLeftFocus={() => secondRef.current?.focus()}
        />
      </div>
    </div>
  );
}
