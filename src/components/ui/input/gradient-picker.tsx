import { Controller, ControllerRenderProps } from "react-hook-form";
import InputDecorator from "./decorator";
import { ControlledRhfInputProps } from ".";
import { cn } from "@/src/utils";
import { GradientPicker } from "../gradient-picker";

type InputGradientPickerProps = ControlledRhfInputProps;

export default function InputGradientPicker(props: InputGradientPickerProps) {
  const input = ({ field }: { field: ControllerRenderProps }) => (
    <InputDecorator {...props} className="mt-1.5">
      <GradientPicker
        className={cn("w-full", props.className)}
        background={field.value}
        setBackground={(value) => {
          field.onChange(value);
        }}
        disabled={props.disabled}
      />
    </InputDecorator>
  );

  return (
    <Controller
      name={props.rhfKey || ""}
      control={props.control}
      rules={props.disableValidation ? { validate: () => true } : undefined}
      render={({ field }) => input({ field })}
    />
  );
}
