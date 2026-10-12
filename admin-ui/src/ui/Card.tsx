import type { ComponentProps } from "react";
import { cn } from "./cn";

export function Card({ className, ...rest }: ComponentProps<"div">) {
  return <div {...rest} className={cn("ui-card", className)} />;
}
