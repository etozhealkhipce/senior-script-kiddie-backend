import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// All tests use the stub; a test needing the real library calls vi.unmock("drawably/react").
vi.mock("drawably/react", () => import("./drawably-react-stub"));

afterEach(() => {
  cleanup();
});
