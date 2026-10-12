import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Tags } from "./Tags";

describe("Tags", () => {
  it("renders tags comma-separated like the site, highlighted ones in a flat mark", () => {
    const { container } = render(
      <Tags
        items={[
          { title: "astro", highlight: true },
          { title: "routing", highlight: false },
          { title: "bug", highlight: true },
        ]}
      />,
    );
    expect(container.textContent).toBe("astro, routing, bug");
    const marks = container.querySelectorAll("mark");
    expect([...marks].map((m) => m.textContent)).toEqual(["astro", "bug"]);
    expect(marks[0].className).toContain("ui-mark");
  });

  it("renders nothing for an empty list", () => {
    const { container } = render(<Tags items={[]} />);
    expect(container.innerHTML).toBe("");
  });
});
