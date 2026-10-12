import type { ComponentProps } from "react";
import { cn } from "./cn";

export function Divider({ className, ...rest }: ComponentProps<"hr">) {
  return <hr {...rest} className={cn("ui-divider", className)} />;
}
