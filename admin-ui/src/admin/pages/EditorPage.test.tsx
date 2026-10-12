import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@block-forge/block-forge-editor", () => ({
  BlockForgeEditor: () => <div data-testid="block-editor" />,
}));
vi.mock("@editorjs/marker", () => ({ default: class Marker {} }));

import { EMPTY_FORM, type NoteForm } from "../constants";
import { EditorPage } from "./EditorPage";

function renderEditor(form: Partial<NoteForm> = {}, editingId: number | null = null) {
  const props = {
    form: { ...EMPTY_FORM, ...form },
    editingId,
    editorKey: 1,
    initialEditorData: null,
    saving: false,
    onFormChange: vi.fn(),
    onEditorChange: vi.fn(),
    onSave: vi.fn(),
    onCancel: vi.fn(),
  };
  render(<EditorPage {...props} />);
  return props;
}

describe("EditorPage", () => {
  it("derives the slug from the title for a new entry", () => {
    const props = renderEditor();
    fireEvent.change(screen.getByLabelText("title"), {
      target: { value: "Hello World!" },
    });
    expect(props.onFormChange).toHaveBeenCalledWith({
      title: "Hello World!",
      slug: "hello-world",
    });
  });

  it("keeps the slug when editing", () => {
    const props = renderEditor({ title: "a", slug: "keep-me" }, 7);
    fireEvent.change(screen.getByLabelText("title"), {
      target: { value: "b" },
    });
    expect(props.onFormChange).toHaveBeenCalledWith({
      title: "b",
      slug: "keep-me",
    });
  });

  it("lets a hyphen be typed into the slug while editing it", () => {
    const props = renderEditor({ title: "t", slug: "" }, 7);
    fireEvent.change(screen.getByLabelText("slug"), {
      target: { value: "My Slug-" },
    });
    expect(props.onFormChange).toHaveBeenCalledWith({ slug: "my-slug-" });
  });

  it("trims a dangling hyphen from the slug on blur", () => {
    const props = renderEditor({ title: "t", slug: "my-slug-" }, 7);
    fireEvent.blur(screen.getByLabelText("slug"));
    expect(props.onFormChange).toHaveBeenCalledWith({ slug: "my-slug" });
  });

  it("does not touch a clean slug on blur", () => {
    const props = renderEditor({ title: "t", slug: "my-slug" }, 7);
    fireEvent.blur(screen.getByLabelText("slug"));
    expect(props.onFormChange).not.toHaveBeenCalled();
  });

  it("shows work-only link fields and the right path prefix", () => {
    renderEditor({ contentType: "work" });
    expect(screen.getByLabelText("link url")).toBeTruthy();
    expect(screen.getByText("/work/")).toBeTruthy();
  });

  it("hides link fields for notes", () => {
    renderEditor({ contentType: "note" });
    expect(screen.queryByLabelText("link url")).toBeNull();
    expect(screen.getByText("/notes/")).toBeTruthy();
  });

  it("switches type through tabs", () => {
    const props = renderEditor();
    fireEvent.click(screen.getByRole("tab", { name: "work" }));
    expect(props.onFormChange).toHaveBeenCalledWith({ contentType: "work" });
  });

  it("publishes only with a title and slug, and labels the action", () => {
    const props = renderEditor({ title: "t", slug: "t" });
    fireEvent.click(screen.getByRole("button", { name: "publish note" }));
    expect(props.onSave).toHaveBeenCalled();
  });

  it("disables publishing without a title", () => {
    renderEditor({ title: "", slug: "" });
    expect(screen.getByRole("button", { name: "publish note" })).toHaveProperty("disabled", true);
  });

  it("goes back and discards", () => {
    const props = renderEditor();
    fireEvent.click(screen.getByRole("button", { name: "‹ entries" }));
    fireEvent.click(screen.getByRole("button", { name: "discard" }));
    expect(props.onCancel).toHaveBeenCalledTimes(2);
  });

  it("renders the block editor inside the plain framed card", () => {
    renderEditor();
    expect(screen.getByTestId("block-editor").closest(".editor-card")).toBeTruthy();
  });
});
