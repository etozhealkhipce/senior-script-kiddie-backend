import { Plus, X } from "lucide-react";
import { type FC, useRef, useState } from "react";
import type { TagItem } from "../constants";

interface TagEditorProps {
  items: TagItem[];
  onChange: (items: TagItem[]) => void;
}

export const TagEditor: FC<TagEditorProps> = ({ items, onChange }) => {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = (raw: string) => {
    const titles = raw.split(",").map((t) => t.trim()).filter(Boolean);
    const fresh = titles.filter((t) => !items.some((i) => i.title === t));
    if (fresh.length)
      onChange([...items, ...fresh.map((t) => ({ title: t, highlight: false }))]);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (input.trim()) { commit(input); setInput(""); }
    } else if (e.key === "Backspace" && !input && items.length) {
      onChange(items.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {items.map((item, i) => (
        <span
          key={`${item.title}-${i}`}
          className={`adm-tag ${
            item.highlight
              ? "bg-tag-hl text-tag-hl-text border-tag-hl-border"
              : "bg-tag-base text-tag-base-text border-tag-base-border"
          }`}
        >
          <button
            type="button"
            title={item.highlight ? "Remove highlight" : "Highlight"}
            className="bg-transparent border-none p-0 cursor-pointer text-inherit font-inherit text-[length:inherit]"
            onClick={() => onChange(items.map((t, j) => j === i ? { ...t, highlight: !t.highlight } : t))}
          >
            {item.title}
          </button>
          <button
            type="button"
            className="adm-tag-x"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            aria-label={`Remove ${item.title}`}
          >
            <X size={9} />
          </button>
        </span>
      ))}
      <span className="adm-tag-add" onClick={() => inputRef.current?.focus()}>
        <Plus size={11} />
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => { if (input.trim()) { commit(input); setInput(""); } }}
          placeholder="add tag"
          className="adm-tag-input-inline"
        />
      </span>
    </div>
  );
};
