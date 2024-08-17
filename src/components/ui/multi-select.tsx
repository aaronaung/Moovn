"use client";

import * as React from "react";
import { X } from "lucide-react";

import { Badge } from "./badge";
import { Command, CommandGroup, CommandItem } from "./command";
import { Command as CommandPrimitive } from "cmdk";
import { cn } from "@/src/utils";

type SelectOption = Record<"value" | "label", string>;

type FancyMultiSelectProps = {
  className?: string;
  selected: string[];
  options: SelectOption[];
  onSelectChange: (selected: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function FancyMultiSelect({
  className,
  selected = [],
  options,
  onSelectChange,
  placeholder,
  disabled,
}: FancyMultiSelectProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const labelMap = React.useMemo(() => {
    const map = new Map();
    options.forEach((o) => {
      map.set(o.value, o.label);
    });
    return map;
  }, [options]);

  const handleUnselect = React.useCallback(
    (unselectedVal: string) => {
      onSelectChange(selected.filter((s) => s !== unselectedVal));
    },
    [selected],
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const input = inputRef.current;
      if (input) {
        if (e.key === "Delete" || e.key === "Backspace") {
          if (input.value === "") {
            const newSelected = [...selected];
            newSelected.pop();
            onSelectChange(newSelected);
          }
        }
        // This is not a default behaviour of the <input /> field
        if (e.key === "Escape") {
          input.blur();
        }
      }
    },
    [selected],
  );

  const selectables = options.map((o) => o.value).filter((val) => !selected.includes(val));

  return (
    <Command onKeyDown={handleKeyDown} className={cn("overflow-visible bg-transparent", className)}>
      <div className="group rounded-md border border-input px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        <div className="flex flex-wrap gap-1">
          {selected.map((value) => {
            return (
              <Badge key={value} variant="secondary">
                {labelMap.get(value)}
                <button
                  disabled={disabled}
                  className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleUnselect(value);
                    }
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={() => handleUnselect(value)}
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
              </Badge>
            );
          })}
          {/* Avoid having the "Search" Icon */}
          <CommandPrimitive.Input
            ref={inputRef}
            disabled={disabled}
            value={inputValue}
            onValueChange={setInputValue}
            onBlur={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className={cn(
              "ml-1 flex-1 border-none bg-transparent p-0 outline-none placeholder:text-sm placeholder:text-muted-foreground focus:border-none focus:ring-0",
            )}
          />
        </div>
      </div>
      <div className="relative mt-1.5">
        {open && selectables.length > 0 ? (
          <div className="absolute top-0 z-10 max-h-[200px] w-full overflow-scroll rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
            <CommandGroup className="h-full overflow-auto">
              {selectables.map((value) => {
                return (
                  <CommandItem
                    key={value}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onSelect={() => {
                      setInputValue("");
                      onSelectChange([...selected, value]);
                    }}
                    className={"cursor-pointer"}
                  >
                    {labelMap.get(value)}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </div>
        ) : null}
      </div>
    </Command>
  );
}
