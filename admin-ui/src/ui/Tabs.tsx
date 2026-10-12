import { Fragment } from "react";
import { cn } from "./cn";

export type TabItem<T extends string> = {
  value: T;
  label: string;
  count?: number;
};

type TabsProps<T extends string> = {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
};

export function Tabs<T extends string>({ items, value, onChange, label, className }: TabsProps<T>) {
  return (
    <div role="tablist" aria-label={label} className={cn("ui-tabs", className)}>
      {items.map((item, i) => (
        <Fragment key={item.value}>
          {i > 0 && (
            <span aria-hidden="true" className="ui-tab-sep">
              /
            </span>
          )}
          <button
            type="button"
            role="tab"
            aria-selected={item.value === value}
            className="ui-tab"
            onClick={() => onChange(item.value)}
          >
            {item.label}
            {item.count !== undefined && <span className="ui-tab-count">{item.count}</span>}
          </button>
        </Fragment>
      ))}
    </div>
  );
}
