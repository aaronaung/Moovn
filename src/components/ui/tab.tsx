import { Button } from "./button";

export default function Tab<Type>({
  type,
  selected,
  onSelect,
}: {
  type: Type;
  selected: Type;
  onSelect: (tab: Type) => void;
}) {
  return (
    <Button
      onClick={() => {
        if (selected !== type) {
          onSelect(type);
        }
      }}
      variant={selected === type ? "default" : "secondary"}
      className="rounded-full hover:bg-primary hover:text-secondary"
    >
      {type as string}
    </Button>
  );
}
