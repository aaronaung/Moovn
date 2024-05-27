import { cn } from "@/src/utils";
import { CommonRhfInputProps } from ".";
import { Label } from "../label";

export default function InputDecorator({
  label,
  description,
  error,
  rhfKey,
  ...props
}: React.PropsWithChildren<CommonRhfInputProps>) {
  return (
    <div className={props.className}>
      {label && (
        <Label className="leading-4" htmlFor={rhfKey}>
          {label}
        </Label>
      )}
      <div
        className={cn(
          label && "mt-1.5",
          "text-lg",
          error && "rounded-md ring-1 ring-destructive ring-offset-background",
        )}
      >
        {props.children}
      </div>
      {description && (
        <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
      )}
      {error && <p className="my-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
