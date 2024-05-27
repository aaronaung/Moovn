import { cn } from "@/src/utils";

export const Header2 = ({
  title,
  className,
}: {
  title: string;
  className?: any;
}) => {
  return (
    <h2
      className={cn(
        "text-base font-semibold leading-7 text-foreground",
        className,
      )}
    >
      {title}
    </h2>
  );
};
