import { motion } from "framer-motion";

let tabs = [
  { id: "world", label: "World" },
  { id: "ny", label: "N.Y." },
  { id: "business", label: "Business" },
  { id: "arts", label: "Arts" },
  { id: "science", label: "Science" },
];

type AnimatedTabsProps = {
  tabs: { id: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
};
export default function AnimatedTabs({ tabs, value, onChange }: AnimatedTabsProps) {
  return (
    <div className="flex space-x-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`${
            value === tab.id ? "" : "hover:text-muted-foreground"
          } relative rounded-full px-3 py-1.5 text-sm font-medium outline-sky-400 transition focus-visible:outline-2`}
          style={{
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {value === tab.id && (
            <motion.span
              layoutId="bubble"
              // className="absolute inset-0 z-10 bg-white mix-blend-difference"
              style={{ borderRadius: 9999 }}
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
