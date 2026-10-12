import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "./AppShell";

function renderShell(overrides: Partial<Parameters<typeof AppShell>[0]> = {}) {
  const onNavigate = vi.fn();
  const onLogout = vi.fn();
  render(
    <AppShell
      section="entries"
      title="entries"
      entriesCount={12}
      imagesCount={3}
      onNavigate={onNavigate}
      onLogout={onLogout}
      {...overrides}
    >
      <p>content</p>
    </AppShell>,
  );
  return { onNavigate, onLogout };
}

describe("AppShell", () => {
  it("renders content and both navigations with the active section marked", () => {
    renderShell();
    expect(screen.getByText("content")).toBeTruthy();
    const navs = screen.getAllByRole("navigation");
    expect(navs).toHaveLength(2);
    for (const nav of navs) {
      const active = nav.querySelector("[aria-current='page']");
      expect(active?.textContent).toContain("entries");
    }
  });

  it("navigates on click", () => {
    const { onNavigate } = renderShell();
    fireEvent.click(screen.getAllByRole("button", { name: /images/ })[0]);
    expect(onNavigate).toHaveBeenCalledWith("images");
  });

  it("signs out", () => {
    const { onLogout } = renderShell();
    fireEvent.click(screen.getAllByRole("button", { name: "sign out" })[0]);
    expect(onLogout).toHaveBeenCalled();
  });

  it("hides the mobile tab bar for the editor", () => {
    renderShell({ hideTabBar: true });
    expect(screen.getAllByRole("navigation")).toHaveLength(1);
    expect(document.querySelector(".app-tabbar")).toBeNull();
  });

  it("shows the mobile title", () => {
    renderShell({ title: "new entry" });
    expect(document.querySelector(".app-topbar")?.textContent).toContain("new entry");
  });
});
