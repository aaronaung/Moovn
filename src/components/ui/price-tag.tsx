import { cn } from "@/src/utils";

export default function PriceTag({
  price,
  suffix,
  fixed,
  className,
}: {
  price?: number | null;
  suffix?: string;
  fixed?: number;
  className?: any;
}) {
  return (
    <span
      className={cn(
        className,
        "inline-flex max-w-fit flex-shrink-0 items-center rounded-md bg-green-50 px-1.5 py-0.5 text-sm font-medium text-green-700 ring-1 ring-inset ring-green-600/20",
      )}
    >
      {" "}
      {price === 0
        ? "Free"
        : `$${((price || 0) / 100).toFixed(fixed === undefined ? 0 : fixed)} ${
            suffix || ""
          }`.trim()}
    </span>
  );
}
