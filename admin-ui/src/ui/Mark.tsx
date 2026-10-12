import type { ComponentProps } from "react";
import { cn } from "./cn";

/** Flat accent wash behind a word, like highlighted tags on sskd.tech. */
export function Mark({ className, ...rest }: ComponentProps<"mark">) {
  return <mark {...rest} className={cn("ui-mark", className)} />;
}
