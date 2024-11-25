"use client";

import { RefObject, useRef } from "react";
import { useDateSegment } from "react-aria";
import { DateFieldState, DateSegment as IDateSegment } from "react-stately";
import { cn } from "@/src/utils";

interface DateSegmentProps {
  segment: IDateSegment;
  state: DateFieldState;
}

function DateSegment({ segment, state }: DateSegmentProps) {
  const ref = useRef<HTMLDivElement>(null);

  const {
    segmentProps: { ...segmentProps },
  } = useDateSegment(segment, state, ref as RefObject<HTMLDivElement>);

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

export { DateSegment };
