import InputDecorator from "./decorator";
import { RhfInputProps } from ".";
import { cn } from "@/src/utils";
import React from "react";

type InputTextProps = RhfInputProps & {
  suffix?: React.ReactNode;
  prefix?: React.ReactNode;
};

export default function InputText(props: InputTextProps) {
  return (
    <InputDecorator {...props}>
      <div
        className={cn(
          props.className,
          "text-md file:text-md  flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 ring-offset-background file:border-0 file:bg-transparent file:font-medium  focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus:ring-1",
          props.disabled && "cursor-not-allowed opacity-50",
          props.label && "mt-1.5",
        )}
      >
        {props.prefix}
        <input
          {...props.inputProps}
          {...(props.register && props.rhfKey
            ? props.register(props.rhfKey, {
                ...props.registerOptions,
                ...(props.disableValidation ? { validate: () => true } : {}),
              })
            : {})}
          {...(props.value ? { value: props.value } : {})}
          {...(props.onChange ? { onChange: props.onChange } : {})}
          {...(props.defaultValue ? { defaultValue: props.defaultValue } : {})}
          disabled={props.disabled}
          name={props.rhfKey}
          id={props.rhfKey}
          className={cn(
            "text-md w-full border-0 bg-transparent p-0 pr-3 placeholder:text-sm placeholder:text-muted-foreground focus:ring-0",
            props.inputProps?.className,
          )}
        />
        {props.suffix}
      </div>
    </InputDecorator>
  );
}
