import { DrawablyButton } from "drawably/react";
import type { ComponentProps } from "react";
import { cn } from "./cn";
import { STILL } from "./motion";

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
    <DrawablyButton
      key={variant}
      {...rest}
      variant={variant === "primary" ? "solid" : "outline"}
      tone={variant === "danger" ? "danger" : undefined}
      state={loading ? "loading" : "idle"}
      boil={STILL}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn("ui-button", block && "ui-button--block", className)}
    >
      <span className="ui-button-label">{children}</span>
    </DrawablyButton>
  );
}
