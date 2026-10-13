import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Field } from "./Field";
import { TextArea } from "./TextArea";

describe("Field", () => {
  it("labels a plain input", () => {
    render(<Field label="password" type="password" />);
    const input = screen.getByLabelText("password");
    expect(input.tagName).toBe("INPUT");
    expect(input.getAttribute("type")).toBe("password");
    expect(input.className).toContain("ui-input");
  });

  it("describes the input with hint and error and marks it invalid", () => {
    render(<Field label="code" hint="6 digits" error="Invalid code" />);
    const input = screen.getByLabelText("code");
    const describedBy = input.getAttribute("aria-describedby") ?? "";
    const ids = describedBy.split(" ");
    expect(ids).toHaveLength(2);
    expect(ids.map((id) => document.getElementById(id)?.textContent)).toEqual([
      "6 digits",
      "Invalid code",
    ]);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect((input.parentElement as HTMLElement).className).toContain("ui-field-row--error");
  });

  it("renders a prefix and a large variant", () => {
    render(<Field label="slug" prefix="/notes/" large />);
    expect(screen.getByText("/notes/")).toBeTruthy();
    expect((screen.getByLabelText("slug").parentElement as HTMLElement).className).toContain(
      "ui-field-row--large",
    );
  });

  it("TextArea follows the same rules", () => {
    render(<TextArea label="preview" rows={3} />);
    const area = screen.getByLabelText("preview");
    expect(area.tagName).toBe("TEXTAREA");
    expect(area.className).toContain("ui-textarea");
  });
});
