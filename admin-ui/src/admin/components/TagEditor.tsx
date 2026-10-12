import { type FC, type KeyboardEvent, useState } from "react";
import { Badge, Field, Mark } from "../../ui";
import type { TagItem } from "../constants";

export function parseTags(raw: string, existing: TagItem[]): TagItem[] {
  const fresh: TagItem[] = [];
  for (const title of raw.split(",").map((t) => t.trim())) {
    if (!title) continue;
    if (existing.some((t) => t.title === title) || fresh.some((t) => t.title === title)) continue;
    fresh.push({ title, highlight: false });
  }
  return fresh;
}

type TagEditorProps = {
  items: TagItem[];
  onChange: (items: TagItem[]) => void;
};

export const TagEditor: FC<TagEditorProps> = ({ items, onChange }) => {
  const [input, setInput] = useState("");

  const commit = () => {
    const fresh = parseTags(input, items);
    if (fresh.length) onChange([...items, ...fresh]);
    setInput("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && !input && items.length) {
      onChange(items.slice(0, -1));
    }
  };

  const toggle = (index: number) =>
    onChange(items.map((t, i) => (i === index ? { ...t, highlight: !t.highlight } : t)));

  return (
    <div className="flex flex-col gap-3">
      {items.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {items.map((item, i) => (
            <li key={item.title}>
              <Badge className="tag-chip">
                <button
                  type="button"
                  className="tag-chip-label"
                  aria-pressed={item.highlight}
                  onClick={() => toggle(i)}
                >
                  {item.highlight ? <Mark>{item.title}</Mark> : item.title}
                </button>
                <button
                  type="button"
                  className="tag-chip-remove"
                  aria-label={`remove ${item.title}`}
                  onClick={() => onChange(items.filter((_, j) => j !== i))}
                >
                  ×
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
      <Field
        aria-label="add tag"
        placeholder="add tag, then enter"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commit}
        enterKeyHint="done"
        autoCapitalize="none"
        autoCorrect="off"
        hint="tap a tag to highlight it"
      />
    </div>
  );
};
