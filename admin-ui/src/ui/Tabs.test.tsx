import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Tabs } from "./Tabs";

describe("Tabs", () => {
  const items = [
    { value: "all", label: "all", count: 3 },
    { value: "note", label: "notes", count: 2 },
    { value: "work", label: "work", count: 1 },
  ] as const;

  it("marks the active tab and is a plain tablist with separators", () => {
    render(<Tabs label="filter" items={[...items]} value="note" onChange={() => {}} />);
    const list = screen.getByRole("tablist", { name: "filter" });
    expect(list.dataset.drawably).toBeUndefined();
    const seps = list.querySelectorAll(".ui-tab-sep");
    expect(seps).toHaveLength(2);
    for (const sep of seps) {
      expect(sep.getAttribute("aria-hidden")).toBe("true");
      expect(sep.textContent).toBe("/");
    }
    expect(screen.getByRole("tab", { name: /notes/ }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: /all/ }).getAttribute("aria-selected")).toBe("false");
  });

  it("calls onChange with the clicked value", () => {
    const onChange = vi.fn();
    render(<Tabs label="filter" items={[...items]} value="all" onChange={onChange} />);
    fireEvent.click(screen.getByRole("tab", { name: /work/ }));
    expect(onChange).toHaveBeenCalledWith("work");
  });

  it("shows counts", () => {
    render(<Tabs label="filter" items={[...items]} value="all" onChange={() => {}} />);
    expect(screen.getByRole("tab", { name: /all/ }).textContent).toContain("3");
  });
});
