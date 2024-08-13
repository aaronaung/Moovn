import { Controller, ControllerRenderProps } from "react-hook-form";
import InputDecorator from "./decorator";
import { ControlledRhfInputProps } from ".";
import { cn } from "@/src/utils";
import { DatePickerWithRange } from "../date-range-picker";
import { DateRange } from "react-day-picker";

type InputDateRangePickerProps = ControlledRhfInputProps & {
  onChange?: (dateRange?: DateRange) => void;
};

export default function InputDateRangePicker(props: InputDateRangePickerProps) {
  const input = ({ field }: { field?: ControllerRenderProps }) => {
    const handleDateChange = (dateRange?: DateRange) => {
      field?.onChange(dateRange);
    };
    return (
      <InputDecorator {...props}>
        <DatePickerWithRange
          onChange={props.onChange || handleDateChange}
          value={props.value || field?.value}
          className={cn("w-full", props.className)}
        />
      </InputDecorator>
    );
  };

  if (!props.control) return input({});

  return (
    <Controller
      name={props.rhfKey || ""}
      control={props.control}
      rules={props.disableValidation ? { validate: () => true } : undefined}
      render={({ field }) => input({ field })}
    />
  );
}
