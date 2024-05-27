import { Controller, ControllerRenderProps } from "react-hook-form";
import InputDecorator from "./decorator";

import { ControlledRhfInputProps } from ".";
import { FancyMultiSelect } from "../multi-select";

type InputMultiSelectOption = {
  label: string;
  value: string;
};

type InputMultiSelectProps = ControlledRhfInputProps & {
  options: InputMultiSelectOption[];
  defaultValue?: any;
};
export default function InputMultiSelect(props: InputMultiSelectProps) {
  const input = ({ field }: { field: ControllerRenderProps }) => (
    <InputDecorator {...props}>
      <FancyMultiSelect
        options={props.options}
        disabled={props.disabled}
        selected={props.value || field.value}
        onSelectChange={(value) => {
          if (props.onChange) {
            props.onChange(value);
          }
          field.onChange(value);
        }}
        placeholder={props.inputProps?.placeholder}
      />
    </InputDecorator>
  );

  return (
    <Controller
      name={props.rhfKey || ""}
      control={props.control}
      rules={props.disableValidation ? { validate: () => true } : undefined}
      render={(args) => input(args)}
    />
  );
}
