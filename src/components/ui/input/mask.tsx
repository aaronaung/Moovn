import InputDecorator from "./decorator";
import ReactInputMask, { Props as ReactInputMaskProps } from "react-input-mask";
import { RhfInputProps } from ".";
import { cn } from "@/src/utils";

type InputMaskProps = RhfInputProps & { maskProps: ReactInputMaskProps };

export default function InputMask(props: InputMaskProps) {
  return (
    <InputDecorator {...props}>
      <ReactInputMask
        {...props.inputProps}
        {...props.maskProps}
        {...(props.register && props.rhfKey
          ? props.register(props.rhfKey, {
              ...props.registerOptions,
              ...(props.disableValidation ? { validate: () => true } : {}),
            })
          : {})}
        name={props.rhfKey}
        id={props.rhfKey}
        className={cn(
          "text-md file:text-md mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 ring-offset-background file:border-0 file:bg-transparent file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          props.disabled && "cursor-not-allowed opacity-50",
          props.className,
        )}
      />
    </InputDecorator>
  );
}
