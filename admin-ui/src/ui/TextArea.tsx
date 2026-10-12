import { DrawablyTextarea } from "drawably/react";
import { type ComponentProps, useId } from "react";
import { cn } from "./cn";
import { STILL } from "./motion";

type TextAreaProps = ComponentProps<"textarea"> & {
  label?: string;
  hint?: string;
  error?: string;
};

export function TextArea({ label, hint, error, id, className, ...rest }: TextAreaProps) {
  const autoId = useId();
  const areaId = id ?? autoId;
  const hintId = hint ? `${areaId}-hint` : undefined;
  const errorId = error ? `${areaId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("ui-field", className)}>
      {label && (
        <label htmlFor={areaId} className="ui-label">
          {label}
        </label>
      )}
      <DrawablyTextarea
        {...rest}
        id={areaId}
        boil={STILL}
        stroke={error ? "var(--drawably-error)" : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className="ui-input ui-textarea"
      />
      {hint && (
        <p id={hintId} className="ui-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="ui-error">
          {error}
        </p>
      )}
    </div>
  );
}
