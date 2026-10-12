import type { ComponentProps } from "react";
import { cn } from "./cn";

export function Badge({ className, ...rest }: ComponentProps<"span">) {
  return <span {...rest} className={cn("ui-badge", className)} />;
}
