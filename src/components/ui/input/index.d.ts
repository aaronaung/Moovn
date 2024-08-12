import { Control, RegisterOptions, UseFormRegister } from "react-hook-form";

export type CommonRhfInputProps = {
  className?: string;
  description?: string;
  disabled?: boolean;
  disableValidation?: boolean;
  error?: string;
  label?: string;
  rhfKey?: string;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement>;
  onChange?: (e) => void; // This is used for when you want to do extra things on top of RHF or not use RHF controls.
  value?: any; // This is used for when you want to do extra things on top of RHF or not use RHF controls.
  defaultValue?: any;
};

export type ControlledRhfInputProps = CommonRhfInputProps & {
  control?: Control<any>;
};
export type RhfInputProps = CommonRhfInputProps & {
  register?: UseFormRegister<any>;
  registerOptions?: RegisterOptions;
};
