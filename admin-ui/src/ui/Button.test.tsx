import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("primary is a native button with the primary class", () => {
    render(<Button variant="primary">save</Button>);
    const b = screen.getByRole("button", { name: "save" });
    expect(b.tagName).toBe("BUTTON");
    expect(b.getAttribute("type")).toBe("button");
    expect(b.className).toContain("ui-button");
    expect(b.className).toContain("ui-button--primary");
  });

  it("secondary is the default and danger has its own class", () => {
    render(
      <>
        <Button>cancel</Button>
        <Button variant="danger">delete</Button>
      </>,
    );
    expect(screen.getByRole("button", { name: "cancel" }).className).toContain(
      "ui-button--secondary",
    );
    expect(screen.getByRole("button", { name: "delete" }).className).toContain("ui-button--danger");
  });

  it("loading shows the loading state and blocks clicks", () => {
    const onClick = vi.fn();
    render(
      <Button variant="primary" loading onClick={onClick}>
        save
      </Button>,
    );
    const b = screen.getByRole("button", { name: "save" });
    expect(b).toHaveProperty("disabled", true);
    expect(b.getAttribute("aria-busy")).toBe("true");
    expect(b.querySelector(".ui-spinner")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("link renders a plain text button", () => {
    render(<Button variant="link">‹ back</Button>);
    const b = screen.getByRole("button", { name: "‹ back" });
    expect(b.className).toContain("ui-link");
    expect(b.getAttribute("type")).toBe("button");
  });

  it("link-danger is a plain text button with the danger hover class", () => {
    render(<Button variant="link-danger">delete</Button>);
    const b = screen.getByRole("button", { name: "delete" });
    expect(b.className).toContain("ui-link");
    expect(b.className).toContain("ui-link--danger");
  });

  it("block makes it full width", () => {
    render(<Button block>wide</Button>);
    expect(screen.getByRole("button", { name: "wide" }).className).toContain("ui-button--block");
  });
});
