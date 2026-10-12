import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  dismissToast,
  MAX_TOASTS,
  resetToasts,
  subscribeToasts,
  TOAST_DURATION_MS,
  type ToastItem,
  toast,
} from "./toast";

describe("toast store", () => {
  let seen: ToastItem[] = [];
  let unsubscribe: () => void;

  beforeEach(() => {
    vi.useFakeTimers();
    resetToasts();
    unsubscribe = subscribeToasts((items) => {
      seen = items;
    });
  });

  afterEach(() => {
    unsubscribe();
    resetToasts();
    vi.useRealTimers();
  });

  it("adds success and error toasts in order", () => {
    toast.success("saved");
    toast.error("failed", "HTTP 500");
    expect(seen.map((t) => [t.kind, t.title, t.description])).toEqual([
      ["success", "saved", undefined],
      ["error", "failed", "HTTP 500"],
    ]);
  });

  it("dismisses automatically after the duration", () => {
    toast.success("saved");
    vi.advanceTimersByTime(TOAST_DURATION_MS - 1);
    expect(seen).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(seen).toHaveLength(0);
  });

  it("keeps only the newest MAX_TOASTS", () => {
    for (let i = 0; i < MAX_TOASTS + 2; i++) toast.success(`t${i}`);
    expect(seen.map((t) => t.title)).toEqual(["t2", "t3", "t4"]);
  });

  it("dismisses by id", () => {
    const id = toast.error("oops");
    toast.success("ok");
    dismissToast(id);
    expect(seen.map((t) => t.title)).toEqual(["ok"]);
  });

  it("stops notifying after unsubscribe", () => {
    unsubscribe();
    toast.success("later");
    expect(seen).toHaveLength(0);
  });
});
