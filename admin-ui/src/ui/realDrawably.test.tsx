import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

// Use the REAL drawably: the stub never inserts the sketch <svg>, which hid this bug.
vi.unmock("drawably/react");

describe("kit with real drawably", () => {
  it("Button keeps its sketch svg when the label changes", () => {
    const { container, rerender } = render(<Button variant="primary">publish note</Button>);
    const button = container.querySelector("button") as HTMLButtonElement;
    expect(button.querySelector("svg")).not.toBeNull();
    rerender(<Button variant="primary">publish work</Button>);
    expect(button.querySelector("svg")).not.toBeNull();
    expect(button.textContent).toBe("publish work");
  });

  it("Button remounts on a variant change so stale variant classes do not linger", () => {
    const { container, rerender } = render(<Button variant="primary">go</Button>);
    expect(container.querySelector(".drawably-button--solid")).not.toBeNull();
    rerender(<Button variant="secondary">go</Button>);
    expect(container.querySelector(".drawably-button--solid")).toBeNull();
    expect(container.querySelector("button svg")).not.toBeNull();
  });
});
