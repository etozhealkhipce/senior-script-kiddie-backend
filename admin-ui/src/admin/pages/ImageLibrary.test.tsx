import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmProvider } from "../../ui";
import { ImageLibrary } from "./ImageLibrary";

function renderLibrary(over: Partial<Parameters<typeof ImageLibrary>[0]> = {}) {
  const fileInputRef = createRef<HTMLInputElement>();
  const props = {
    uploadedImages: [
      { name: "a.png", url: "/uploads/a.png" },
      { name: "b.png", url: "/uploads/b.png" },
    ],
    uploading: false,
    copied: null,
    fileInputRef,
    onUpload: vi.fn(),
    onDelete: vi.fn(),
    onCopy: vi.fn(),
    ...over,
  };
  render(
    <ConfirmProvider>
      <ImageLibrary {...props} />
    </ConfirmProvider>,
  );
  return props;
}

/** The open confirmation dialog; its buttons share names with the card actions outside it. */
function dialogScope() {
  return within(document.querySelector("dialog") as HTMLElement);
}

describe("ImageLibrary", () => {
  it("opens the file picker from the upload button", () => {
    const props = renderLibrary();
    const click = vi.spyOn(props.fileInputRef.current as HTMLInputElement, "click");
    fireEvent.click(screen.getByRole("button", { name: "+ upload" }));
    expect(click).toHaveBeenCalled();
  });

  it("reveals actions on tap and copies the url", () => {
    const props = renderLibrary();
    expect(screen.queryByRole("button", { name: "copy url" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "a.png" }));
    fireEvent.click(screen.getByRole("button", { name: "copy url" }));
    expect(props.onCopy).toHaveBeenCalledWith("/uploads/a.png");
  });

  it("deletes after confirmation", async () => {
    const props = renderLibrary();
    fireEvent.click(screen.getByRole("button", { name: "b.png" }));
    fireEvent.click(screen.getByRole("button", { name: "delete" }));
    await act(async () => {
      fireEvent.click(dialogScope().getByRole("button", { name: "delete" }));
    });
    expect(props.onDelete).toHaveBeenCalledWith("b.png");
  });

  it("does not delete when the confirmation is cancelled", async () => {
    const props = renderLibrary();
    fireEvent.click(screen.getByRole("button", { name: "b.png" }));
    fireEvent.click(screen.getByRole("button", { name: "delete" }));
    await act(async () => {
      fireEvent.click(dialogScope().getByRole("button", { name: "cancel" }));
    });
    expect(props.onDelete).not.toHaveBeenCalled();
  });

  it("shows the empty state", () => {
    renderLibrary({ uploadedImages: [] });
    expect(screen.getByText("no images yet")).toBeTruthy();
  });
});
