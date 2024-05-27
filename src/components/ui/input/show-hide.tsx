import { useState } from "react";
import InputDecorator from "./decorator";
import { RhfInputProps } from ".";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/solid";
import { cn } from "@/src/utils";

type InputShowHideProps = RhfInputProps;

export default function InputShowHide(props: InputShowHideProps) {
  const [obscured, setObscured] = useState(true);

  return (
    <InputDecorator {...props}>
      <div
        className={cn(
          "text-md file:text-md mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 ring-offset-background file:border-0 file:bg-transparent file:font-medium placeholder:text-muted-foreground focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus:ring-1 disabled:cursor-not-allowed disabled:opacity-50",
          props.disabled && "cursor-not-allowed opacity-50",
          props.className,
        )}
      >
        <input
          {...props.inputProps}
          {...(props.register && props.rhfKey
            ? props.register(props.rhfKey, {
                ...props.registerOptions,
                ...(props.disableValidation ? { validate: () => true } : {}),
              })
            : {})}
          name={props.rhfKey}
          id={props.rhfKey}
          className="w-full border-0 bg-transparent p-0 pr-3 focus:ring-0"
          type={obscured ? "password" : "text"}
        />
        <div
          className="w-6 cursor-pointer"
          onClick={() => {
            setObscured(!obscured);
          }}
        >
          {!obscured ? <EyeIcon /> : <EyeSlashIcon />}
        </div>
      </div>
    </InputDecorator>
  );
}
