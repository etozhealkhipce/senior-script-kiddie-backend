import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { parseTags, TagEditor } from "./TagEditor";

describe("parseTags", () => {
  it("splits on commas, trims, drops empties and duplicates", () => {
    expect(parseTags(" astro, ssg ,, astro,bug ", [{ title: "bug", highlight: true }])).toEqual([
      { title: "astro", highlight: false },
      { title: "ssg", highlight: false },
    ]);
  });
});

describe("TagEditor", () => {
  const items = [
    { title: "astro", highlight: true },
    { title: "routing", highlight: false },
  ];

  it("adds tags on Enter and comma", () => {
    const onChange = vi.fn();
    render(<TagEditor items={items} onChange={onChange} />);
    const input = screen.getByLabelText("add tag");
    fireEvent.change(input, { target: { value: "ssg, bug" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith([
      ...items,
      { title: "ssg", highlight: false },
      { title: "bug", highlight: false },
    ]);
  });

  it("commits on blur", () => {
    const onChange = vi.fn();
    render(<TagEditor items={[]} onChange={onChange} />);
    const input = screen.getByLabelText("add tag");
    fireEvent.change(input, { target: { value: "effector" } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith([{ title: "effector", highlight: false }]);
  });

  it("removes the last tag with Backspace on an empty input", () => {
    const onChange = vi.fn();
    render(<TagEditor items={items} onChange={onChange} />);
    fireEvent.keyDown(screen.getByLabelText("add tag"), { key: "Backspace" });
    expect(onChange).toHaveBeenCalledWith([items[0]]);
  });

  it("toggles highlight on tap and shows it with a marker", () => {
    const onChange = vi.fn();
    render(<TagEditor items={items} onChange={onChange} />);
    const astro = screen.getByRole("button", { name: "astro" });
    expect(astro.getAttribute("aria-pressed")).toBe("true");
    expect(astro.querySelector("mark")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "routing" }));
    expect(onChange).toHaveBeenCalledWith([items[0], { title: "routing", highlight: true }]);
  });

  it("removes a tag with its × button", () => {
    const onChange = vi.fn();
    render(<TagEditor items={items} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "remove astro" }));
    expect(onChange).toHaveBeenCalledWith([items[1]]);
  });
});
