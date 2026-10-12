import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Toaster } from "./Toaster";
import { resetToasts, toast } from "./toast";

describe("Toaster", () => {
  afterEach(() => {
    act(() => resetToasts());
  });

  it("renders toasts with a tag and dismisses on close", () => {
    render(<Toaster />);
    act(() => {
      toast.error("Upload failed", "too big");
      toast.success("Image uploaded");
    });
    const alerts = document.querySelectorAll<HTMLElement>(".ui-toast");
    expect(alerts).toHaveLength(2);
    expect(alerts[0].textContent).toContain("error");
    expect(alerts[0].textContent).toContain("Upload failed");
    expect(alerts[0].textContent).toContain("too big");
    expect(alerts[0].classList.contains("ui-toast--error")).toBe(true);
    expect(alerts[0].querySelector("[data-tag]")?.textContent).toBe("error");
    expect(alerts[0].querySelector("[role=status]")).toBeNull();
    expect(alerts[1].textContent).toContain("done");
    fireEvent.click(screen.getAllByRole("button", { name: "dismiss" })[0]);
    expect(document.querySelectorAll<HTMLElement>(".ui-toast")).toHaveLength(1);
  });

  it("is a polite live region", () => {
    render(<Toaster />);
    expect(document.querySelector(".ui-toaster")?.getAttribute("aria-live")).toBe("polite");
  });
});
