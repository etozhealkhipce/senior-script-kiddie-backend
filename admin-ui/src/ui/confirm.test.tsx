import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { type ConfirmOptions, ConfirmProvider, useConfirm } from "./confirm";

function Harness({
  onResult,
  options,
}: {
  onResult: (ok: boolean) => void;
  options: ConfirmOptions;
}) {
  const confirm = useConfirm();
  return (
    <button type="button" onClick={async () => onResult(await confirm(options))}>
      ask
    </button>
  );
}

function setup(options: ConfirmOptions) {
  const results: boolean[] = [];
  render(
    <ConfirmProvider>
      <Harness options={options} onResult={(ok) => results.push(ok)} />
    </ConfirmProvider>,
  );
  return results;
}

describe("useConfirm", () => {
  it("resolves true when confirmed", async () => {
    const results = setup({
      title: "delete entry?",
      confirmLabel: "delete",
      danger: true,
    });
    fireEvent.click(screen.getByRole("button", { name: "ask" }));
    expect(screen.getByRole("heading", { name: "delete entry?" })).toBeTruthy();
    const confirmButton = screen.getByRole("button", { name: "delete" });
    expect(confirmButton.className).toContain("ui-button--danger");
    await act(async () => {
      fireEvent.click(confirmButton);
    });
    expect(results).toEqual([true]);
    expect(screen.queryByRole("heading", { name: "delete entry?" })).toBeNull();
  });

  it("resolves false on cancel", async () => {
    const results = setup({ title: "sure?" });
    fireEvent.click(screen.getByRole("button", { name: "ask" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "cancel" }));
    });
    expect(results).toEqual([false]);
  });

  it("resolves false on Escape (dialog cancel event)", async () => {
    const results = setup({ title: "sure?" });
    fireEvent.click(screen.getByRole("button", { name: "ask" }));
    const dialog = document.querySelector("dialog") as HTMLDialogElement;
    await act(async () => {
      fireEvent(dialog, new Event("cancel", { cancelable: true }));
    });
    expect(results).toEqual([false]);
  });

  it("resolves a pending request with false when a new one starts", async () => {
    const results = setup({ title: "sure?" });
    fireEvent.click(screen.getByRole("button", { name: "ask" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "ask" }));
    });
    expect(results).toEqual([false]);
  });

  it("throws outside the provider", () => {
    const Broken = () => {
      useConfirm();
      return null;
    };
    expect(() => render(<Broken />)).toThrow(/ConfirmProvider/);
  });
});
