import { Checkbox } from "@/src/components/ui/checkbox";
import { Pike13Logo } from "@/src/components/ui/icons/pike13";
import { SourceTypes } from "@/src/consts/sources";
import { cn } from "@/src/utils";
import { Tables } from "@/types/db";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";

export const SourceContainer = ({
  selected,
  source,
  setSelectedSource,
  setSourceDialogState,
  setDeleteConfirmationDialogState,
}: {
  selected: boolean;
  source: Tables<"sources">;
  setSelectedSource: (source: Tables<"sources">) => void;
  setSourceDialogState: (state: {
    isOpen: boolean;
    source?: Tables<"sources">;
  }) => void;
  setDeleteConfirmationDialogState: (state: {
    isOpen: boolean;
    source?: Tables<"sources">;
  }) => void;
}) => {
  const renderLogo = () => {
    if (source.type === SourceTypes.PIKE13) {
      return <Pike13Logo />;
    }
    return null;
  };

  return (
    <div
      key={source.id}
      className={cn(
        "relative flex h-[200px] min-w-[300px] cursor-pointer flex-col gap-2 rounded-md p-4 hover:bg-secondary",
        selected && "bg-secondary",
      )}
      onClick={() => {
        setSelectedSource(source);
      }}
    >
      <div className="flex items-center ">
        <Checkbox id={source.id} className="mr-2" checked={selected} />
        <label
          htmlFor={source.id}
          id="source-checkbox"
          className="flex-1 text-sm"
        >
          {source.name}
        </label>
        <div className="mb-1 flex gap-x-0.5">
          <PencilSquareIcon
            onClick={() => {
              setSourceDialogState({
                isOpen: true,
                source,
              });
            }}
            className="h-9 w-9 cursor-pointer rounded-full p-2 text-secondary-foreground hover:bg-secondary-foreground hover:text-secondary"
          />
          <TrashIcon
            onClick={() => {
              setDeleteConfirmationDialogState({
                isOpen: true,
                source,
              });
            }}
            className="h-9 w-9 cursor-pointer rounded-full p-2 text-destructive hover:bg-secondary-foreground"
          />
        </div>
      </div>
      <div className="flex h-full w-full items-center justify-center rounded-md bg-secondary-foreground p-8">
        {renderLogo()}
      </div>
    </div>
  );
};
