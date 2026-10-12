import { render, screen } from "@testing-library/react";
import { DrawablyButton, DrawablyInput } from "drawably/react";
import { describe, expect, it } from "vitest";

describe("drawably test stub", () => {
  it("replaces drawably/react in tests and keeps the native elements", () => {
    render(
      <>
        <DrawablyButton boil={0.3} variant="solid">
          go
        </DrawablyButton>
        <DrawablyInput aria-label="name" boil={0} className="wrap" />
      </>,
    );
    const button = screen.getByRole("button", { name: "go" });
    expect(button.dataset.drawably).toBe("button");
    expect(button.dataset.boil).toBe("0.3");
    expect(button.dataset.variant).toBe("solid");
    const input = screen.getByLabelText("name");
    expect(input.tagName).toBe("INPUT");
    expect(input.parentElement?.className).toBe("wrap");
  });
});
