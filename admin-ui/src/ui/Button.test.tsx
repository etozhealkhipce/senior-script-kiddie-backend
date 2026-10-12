import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("primary is a solid, still drawably button", () => {
    render(<Button variant="primary">save</Button>);
    const b = screen.getByRole("button", { name: "save" });
    expect(b.dataset.drawably).toBe("button");
    expect(b.dataset.variant).toBe("solid");
    expect(b.dataset.boil).toBe("0");
    expect(b.dataset.state).toBe("idle");
    expect(b.className).toContain("ui-button");
  });

  it("secondary is the default and danger sets the danger tone", () => {
    render(
      <>
        <Button>cancel</Button>
        <Button variant="danger">delete</Button>
      </>,
    );
    expect(screen.getByRole("button", { name: "cancel" }).dataset.variant).toBe("outline");
    const danger = screen.getByRole("button", { name: "delete" });
    expect(danger.dataset.variant).toBe("outline");
    expect(danger.dataset.tone).toBe("danger");
  });

  it("loading shows the loading state and blocks clicks", () => {
    const onClick = vi.fn();
    render(
      <Button variant="primary" loading onClick={onClick}>
        save
      </Button>,
    );
    const b = screen.getByRole("button", { name: "save" });
    expect(b.dataset.state).toBe("loading");
    expect(b).toHaveProperty("disabled", true);
    expect(b.getAttribute("aria-busy")).toBe("true");
  });

  it("link renders a plain text button without a sketch", () => {
    render(<Button variant="link">‹ back</Button>);
    const b = screen.getByRole("button", { name: "‹ back" });
    expect(b.dataset.drawably).toBeUndefined();
    expect(b.className).toContain("ui-link");
    expect(b.getAttribute("type")).toBe("button");
  });

  it("link-danger is a plain text button with the danger hover class", () => {
    render(<Button variant="link-danger">delete</Button>);
    const b = screen.getByRole("button", { name: "delete" });
    expect(b.dataset.drawably).toBeUndefined();
    expect(b.querySelector("svg")).toBeNull();
    expect(b.className).toContain("ui-link");
    expect(b.className).toContain("ui-link--danger");
  });

  it("block makes it full width", () => {
    render(<Button block>wide</Button>);
    expect(screen.getByRole("button", { name: "wide" }).className).toContain("ui-button--block");
  });
});
