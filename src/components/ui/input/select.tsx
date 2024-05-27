import { Controller, ControllerRenderProps } from "react-hook-form";
import InputDecorator from "./decorator";

import { ControlledRhfInputProps } from ".";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../select";
import { cn } from "@/src/utils";
import _ from "lodash";
import { SelectLabel, SelectSeparator } from "@radix-ui/react-select";

type InputSelectOption = {
  label: string;
  value: any;
};

type InputSelectProps = ControlledRhfInputProps & {
  options: InputSelectOption[];
  selectLabel?: string;
  defaultValue?: any;
};
export default function InputSelect(props: InputSelectProps) {
  const input = ({ field }: { field?: ControllerRenderProps }) => (
    <InputDecorator {...props}>
      <Select
        {..._.omit(field, ["ref"])} // passing ref throws a warning.
        {...(props.value ? { value: props.value } : {})}
        {...(props.onChange
          ? { onValueChange: props.onChange }
          : {
              onValueChange: (value) => {
                field?.onChange(value);
              },
            })}
        {...(props.defaultValue ? { defaultValue: props.defaultValue } : {})}
        {...props}
      >
        <SelectTrigger className={cn("w-full", props.className)}>
          <SelectValue
            defaultValue={props.defaultValue || undefined}
            placeholder={props.inputProps?.placeholder}
          />
        </SelectTrigger>
        <SelectContent className="max-h-[250px] overflow-scroll">
          <SelectGroup>
            {props.selectLabel && (
              <>
                <SelectLabel className="ml-2 text-sm text-muted-foreground">
                  {props.selectLabel}
                </SelectLabel>
                <SelectSeparator className="my-3" />
              </>
            )}
            {props.options.map((option) => (
              <SelectItem
                className="cursor-pointer"
                key={option.value}
                value={option.value}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </InputDecorator>
  );

  if (!props.control) {
    return input({});
  }

  return (
    <Controller
      name={props.rhfKey || ""}
      control={props.control}
      rules={props.disableValidation ? { validate: () => true } : undefined}
      render={(args) => input(args)}
    />
  );
}
