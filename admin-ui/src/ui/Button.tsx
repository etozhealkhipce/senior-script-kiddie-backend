import type { ComponentProps } from "react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "danger" | "link" | "link-danger";

type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  loading?: boolean;
  block?: boolean;
};

export function Button({
  variant = "secondary",
  loading = false,
  block = false,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  if (variant === "link" || variant === "link-danger") {
    return (
      <button
        type="button"
        {...rest}
        disabled={disabled}
        className={cn(
          "ui-link",
          variant === "link-danger" && "ui-link--danger",
          block && "w-full",
          className,
        )}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn("ui-button", `ui-button--${variant}`, block && "ui-button--block", className)}
    >
      {loading && <span className="ui-spinner animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
