"use client";
import { PlusIcon } from "@heroicons/react/24/solid";
import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/utils";

type EmptyStateProps = {
  onAction?: () => void;
  actionButtonText?: string;
  title?: string;
  description?: string;
  Icon?: React.ComponentType<{ className?: string }>;
  icon?: React.ReactNode;
  actionButtonIcon?: React.ReactNode;
  actionButtonOverride?: React.ReactNode;
  className?: string;
};

export default function EmptyState({
  onAction,
  actionButtonText,
  title,
  description,
  Icon,
  icon,
  actionButtonOverride,
  actionButtonIcon = <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />,
  className,
}: EmptyStateProps) {
  const renderActionButton = () => {
    if (actionButtonOverride) {
      return <div className="mt-4">{actionButtonOverride}</div>;
    }
    return (
      onAction &&
      actionButtonText && (
        <div className="mt-4">
          <Button className="rounded-full" type="button" onClick={onAction}>
            {actionButtonIcon}
            {actionButtonText}
          </Button>
        </div>
      )
    );
  };

  return (
    <div className={cn("mt-4 text-center", className)}>
      {Icon && <Icon className="mx-auto h-12 w-12" aria-hidden="true" />}
      {icon && icon}
      {title && <p className="mt-2 font-semibold">{title}</p>}
      {description && <p className="mt-1 text-sm  text-muted-foreground">{description}</p>}
      {renderActionButton()}
    </div>
  );
}
