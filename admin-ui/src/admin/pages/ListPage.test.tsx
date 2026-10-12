import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { NoteApiData } from "../../types";
import { ConfirmProvider } from "../../ui";
import { ListPage } from "./ListPage";

const note = (over: Partial<NoteApiData> = {}): NoteApiData => ({
  id: 1,
  slug: "astro-ssg-routing-bug",
  contentType: "note",
  title: "astro ssg routing bug",
  preview: "баг с роутингом",
  content: null,
  subtitle: [
    { title: "astro", highlight: true },
    { title: "routing", highlight: false },
  ],
  tags: ["astro", "routing"],
  link: null,
  linkText: null,
  createdAt: "2026-05-30T10:00:00.000Z",
  updatedAt: "2026-05-30T10:00:00.000Z",
  ...over,
});

function renderList(props: Partial<Parameters<typeof ListPage>[0]> = {}) {
  const handlers = {
    onFilterChange: vi.fn(),
    onNew: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  };
  render(
    <ConfirmProvider>
      <ListPage
        filter="all"
        notes={[
          note(),
          note({
            id: 2,
            title: "work item",
            contentType: "work",
            slug: "w",
            subtitle: null,
            tags: ["react"],
          }),
        ]}
        counts={{ all: 2, note: 1, work: 1 }}
        loading={false}
        {...handlers}
        {...props}
      />
    </ConfirmProvider>,
  );
  return handlers;
}

describe("ListPage", () => {
  it("renders entries like site notes: title, marked tags, path, type", () => {
    renderList();
    expect(screen.getByRole("heading", { name: "entries" })).toBeTruthy();
    expect(screen.getByText("astro ssg routing bug")).toBeTruthy();
    expect(screen.getByText("/notes/astro-ssg-routing-bug")).toBeTruthy();
    expect(screen.getByText("/work/w")).toBeTruthy();
    const mark = document.querySelector("mark");
    expect(mark?.textContent).toBe("astro");
    expect(screen.getByText("react")).toBeTruthy();
  });

  it("filters through tabs", () => {
    const { onFilterChange } = renderList();
    fireEvent.click(screen.getByRole("tab", { name: /work/ }));
    expect(onFilterChange).toHaveBeenCalledWith("work");
  });

  it("opens an entry and creates a new one", () => {
    const { onEdit, onNew } = renderList();
    fireEvent.click(screen.getByRole("button", { name: "astro ssg routing bug" }));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    fireEvent.click(screen.getByRole("button", { name: "+ new" }));
    expect(onNew).toHaveBeenCalled();
  });

  it("deletes only after confirmation", async () => {
    const { onDelete } = renderList();
    fireEvent.click(screen.getAllByRole("button", { name: "delete" })[0]);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "cancel" }));
    });
    expect(onDelete).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole("button", { name: "delete" })[0]);
    const dialogDelete = document.querySelector("dialog")?.querySelectorAll("button");
    await act(async () => {
      fireEvent.click(dialogDelete?.[1] as HTMLButtonElement);
    });
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  it("shows loading and empty states", () => {
    renderList({ loading: true });
    expect(screen.getAllByText("loading…").length).toBeGreaterThan(0);
  });

  it("offers to create the first entry when empty", () => {
    const { onNew } = renderList({
      notes: [],
      counts: { all: 0, note: 0, work: 0 },
    });
    fireEvent.click(screen.getByRole("button", { name: "+ new entry" }));
    expect(onNew).toHaveBeenCalled();
  });
});
