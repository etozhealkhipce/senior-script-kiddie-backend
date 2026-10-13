import { type ComponentProps, useId } from "react";
import { cn } from "./cn";

type FieldProps = ComponentProps<"input"> & {
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
      <div
        className={cn(
          "ui-field-row",
          large && "ui-field-row--large",
          error && "ui-field-row--error",
        )}
      >
        {prefix && <span className="ui-prefix">{prefix}</span>}
        <input
          {...rest}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="ui-input"
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
