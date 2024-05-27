import { Controller, ControllerRenderProps } from "react-hook-form";
import InputDecorator from "./decorator";

import { ControlledRhfInputProps } from ".";
import { Switch } from "../switch";

type InputSwitchProps = ControlledRhfInputProps;
export default function InputSwitch(props: InputSwitchProps) {
  const input = ({ field }: { field: ControllerRenderProps }) => (
    <InputDecorator {...props} className="mt-1.5">
      <Switch
        checked={field.value}
        onCheckedChange={(value) => {
          field.onChange(value);
          props.onChange && props.onChange(value);
        }}
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
