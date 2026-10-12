import { cn } from "./cn";
import { Mark } from "./Mark";

export type TagItem = { title: string; highlight: boolean };

type TagsProps = { items: TagItem[]; className?: string };

export function Tags({ items, className }: TagsProps) {
  if (items.length === 0) return null;
  return (
    <p className={cn("ui-tags", className)}>
      {items.map((item, i) => (
        <span key={item.title}>
          {item.highlight ? <Mark>{item.title}</Mark> : item.title}
          {i < items.length - 1 && ", "}
        </span>
      ))}
    </p>
  );
}
