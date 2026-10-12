import { describe, expect, it } from "vitest";
import { slugDraft } from "./utils";

describe("slugDraft", () => {
  it("keeps a trailing hyphen, collapses repeats, drops a leading one", () => {
    expect(slugDraft("-My  Slug--")).toBe("my-slug-");
  });
});
