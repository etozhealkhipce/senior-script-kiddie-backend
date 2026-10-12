import { DrawablyInput } from "drawably/react";
import { type ComponentProps, useId } from "react";
import { cn } from "./cn";
import { STILL } from "./motion";

// ADAPTATION: drawably's DrawablyOptions.width is a number, clashing with the HTML width attr (string | number).
type FieldProps = Omit<ComponentProps<"input">, "width"> & {
  label?: string;
  hint?: string;
  error?: string;
  prefix?: string;
  large?: boolean;
};

export function Field({ label, hint, error, prefix, large, id, className, ...rest }: FieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("ui-field", className)}>
      {label && (
        <label htmlFor={inputId} className="ui-label">
          {label}
        </label>
      )}
      <div className="ui-field-row">
        {prefix && <span className="ui-prefix">{prefix}</span>}
        <DrawablyInput
          {...rest}
          id={inputId}
          boil={STILL}
          stroke={error ? "var(--drawably-error)" : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn("ui-input", large && "ui-input--large")}
        />
      </div>
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
