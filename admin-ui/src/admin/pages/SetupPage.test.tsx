import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSetup = vi.fn();
const completeSetup = vi.fn();
const registerPasskey = vi.fn();

vi.mock("../auth/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../auth/api")>();
  return {
    ...actual,
    authApi: {
      ...actual.authApi,
      getSetup: (...a: unknown[]) => getSetup(...a),
      completeSetup: (...a: unknown[]) => completeSetup(...a),
    },
  };
});
vi.mock("../auth/passkeys", () => ({
  passkeysSupported: () => true,
  defaultPasskeyName: () => "Mac",
  registerPasskey: (...a: unknown[]) => registerPasskey(...a),
}));

import { ApiError } from "../auth/api";
import { SetupPage } from "./SetupPage";

describe("SetupPage", () => {
  beforeEach(() => {
    getSetup.mockReset().mockResolvedValue({
      secret: "ABCDEFGHIJKLMNOP",
      otpauthUri: "otpauth://totp/x",
    });
    completeSetup.mockReset();
    registerPasskey.mockReset();
  });

  async function renderSetup() {
    const props = { token: "setup-token", onDone: vi.fn(), onExpired: vi.fn() };
    await act(async () => {
      render(<SetupPage {...props} />);
    });
    return props;
  }

  it("shows the secret grouped by four for manual entry", async () => {
    await renderSetup();
    expect(screen.getByText("ABCD EFGH IJKL MNOP")).toBeTruthy();
  });

  it("validates passwords locally", async () => {
    await renderSetup();
    fireEvent.change(screen.getByLabelText("new password"), {
      target: { value: "short" },
    });
    fireEvent.change(screen.getByLabelText("repeat password"), {
      target: { value: "short" },
    });
    fireEvent.change(screen.getByLabelText("code from the app"), {
      target: { value: "123456" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "finish setup" }));
    });
    expect(screen.getByRole("alert").textContent).toBe("Password must be at least 8 characters");
    expect(completeSetup).not.toHaveBeenCalled();
  });

  it("completes setup, offers Face ID and finishes after adding it", async () => {
    const props = await renderSetup();
    completeSetup.mockResolvedValue({ token: "full", kind: "full" });
    registerPasskey.mockResolvedValue({ id: "c", name: "Mac" });
    fireEvent.change(screen.getByLabelText("new password"), {
      target: { value: "correct-horse-1" },
    });
    fireEvent.change(screen.getByLabelText("repeat password"), {
      target: { value: "correct-horse-1" },
    });
    fireEvent.change(screen.getByLabelText("code from the app"), {
      target: { value: "123456" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "finish setup" }));
    });
    expect(completeSetup).toHaveBeenCalledWith("setup-token", "correct-horse-1", "123456");
    expect(screen.getByRole("heading", { name: "add face id?" })).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "add face id" }));
    });
    expect(registerPasskey).toHaveBeenCalledWith("full", "Mac");
    expect(props.onDone).toHaveBeenCalledWith({ token: "full", kind: "full" });
  });

  it("returns to sign-in when the setup session expired", async () => {
    getSetup.mockReset().mockRejectedValue(new ApiError(401, "Invalid or expired session"));
    const props = await renderSetup();
    expect(props.onExpired).toHaveBeenCalled();
  });
});
