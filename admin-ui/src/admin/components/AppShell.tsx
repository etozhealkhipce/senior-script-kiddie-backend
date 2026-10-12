import type { ReactNode } from "react";
import { Button, cn, Divider, Logo, NavLink } from "../../ui";

export type Section = "entries" | "images" | "settings";

export const SECTIONS: { value: Section; label: string }[] = [
  { value: "entries", label: "entries" },
  { value: "images", label: "images" },
  { value: "settings", label: "settings" },
];

type AppShellProps = {
  section: Section;
  title: string;
  entriesCount: number;
  imagesCount: number;
  hideTabBar?: boolean;
  onNavigate: (section: Section) => void;
  onLogout: () => void;
  children: ReactNode;
};

export function AppShell({
  section,
  title,
  entriesCount,
  imagesCount,
  hideTabBar = false,
  onNavigate,
  onLogout,
  children,
}: AppShellProps) {
  const counts: Record<Section, number | undefined> = {
    entries: entriesCount,
    images: imagesCount,
    settings: undefined,
  };

  const links = (withCounts: boolean) =>
    SECTIONS.map((s) => (
      <NavLink
        key={s.value}
        active={section === s.value}
        count={withCounts ? counts[s.value] : undefined}
        onClick={() => onNavigate(s.value)}
      >
        {s.label}
      </NavLink>
    ));

  return (
    <div className="app-shell">
      <div className="app-noise" aria-hidden="true" />

      <aside className="app-aside">
        <Logo className="w-32 xl:w-40" />
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm">sskd / admin</p>
          <Button variant="link" onClick={onLogout}>
            sign out
          </Button>
        </div>
      </aside>

      <header className="app-topbar">
        <Logo className="w-9 shrink-0" />
        <span className="app-topbar-title">{title}</span>
        <Button variant="link" onClick={onLogout}>
          sign out
        </Button>
      </header>

      <main className={cn("app-main", !hideTabBar && "app-main--tabbar")}>{children}</main>

      <nav className="app-nav" aria-label="sections">
        {links(true)}
      </nav>

      {!hideTabBar && (
        <nav className="app-tabbar" aria-label="sections">
          <Divider className="app-tabbar-rule" />
          <div className="app-tabbar-links">{links(false)}</div>
        </nav>
      )}
    </div>
  );
}
