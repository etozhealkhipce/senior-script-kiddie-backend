import type { ReactNode } from "react";
import { cn } from "./cn";

type NavLinkProps = {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  count?: number;
  className?: string;
};

export function NavLink({ active, onClick, children, count, className }: NavLinkProps) {
  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={cn("ui-nav-link", active && "ui-nav-link--active", className)}
    >
      {children}
      {count !== undefined && <span className="ui-nav-count">{count}</span>}
    </button>
  );
}
