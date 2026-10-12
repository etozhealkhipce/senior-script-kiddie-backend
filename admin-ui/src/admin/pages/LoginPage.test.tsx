import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const login = vi.fn();
const signInWithPasskey = vi.fn();
let supported = true;

vi.mock("../auth/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../auth/api")>();
  return {
    ...actual,
    authApi: { ...actual.authApi, login: (...a: unknown[]) => login(...a) },
  };
});
vi.mock("../auth/passkeys", () => ({
  passkeysSupported: () => supported,
  signInWithPasskey: () => signInWithPasskey(),
}));

import { ApiError } from "../auth/api";
import { LoginPage } from "./LoginPage";

describe("LoginPage", () => {
  beforeEach(() => {
    login.mockReset();
    signInWithPasskey.mockReset();
    supported = true;
  });

  it("signs in with Face ID", async () => {
    const onAuthenticated = vi.fn();
    signInWithPasskey.mockResolvedValue({ token: "t", kind: "full" });
    render(<LoginPage onAuthenticated={onAuthenticated} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "sign in with face id" }));
    });
    expect(onAuthenticated).toHaveBeenCalledWith({ token: "t", kind: "full" });
  });

  it("explains a cancelled Face ID prompt and re-enables the button", async () => {
    const err = Object.assign(new Error("denied"), { name: "NotAllowedError" });
    signInWithPasskey.mockRejectedValue(err);
    render(<LoginPage onAuthenticated={vi.fn()} />);
    const button = screen.getByRole("button", { name: "sign in with face id" });
    await act(async () => {
      fireEvent.click(button);
    });
    expect(screen.getByRole("alert").textContent).toBe("Face ID was cancelled or timed out");
    expect(button.dataset.state).toBe("idle");
    expect(button).toHaveProperty("disabled", false);
  });

  it("hides the Face ID button when passkeys are unsupported", () => {
    supported = false;
    render(<LoginPage onAuthenticated={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "sign in with face id" })).toBeNull();
  });

  it("submits password and code", async () => {
    const onAuthenticated = vi.fn();
    login.mockResolvedValue({ token: "s", kind: "setup" });
    render(<LoginPage onAuthenticated={onAuthenticated} />);
    fireEvent.change(screen.getByLabelText("password"), {
      target: { value: "admin123" },
    });
    fireEvent.change(screen.getByLabelText("authenticator code"), {
      target: { value: "123 456" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "continue >" }));
    });
    expect(login).toHaveBeenCalledWith("admin123", "123 456");
    expect(onAuthenticated).toHaveBeenCalledWith({ token: "s", kind: "setup" });
  });

  it("shows the server error", async () => {
    login.mockRejectedValue(new ApiError(401, "Invalid password or code"));
    render(<LoginPage onAuthenticated={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("password"), {
      target: { value: "x" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "continue >" }));
    });
    expect(screen.getByRole("alert").textContent).toBe("Invalid password or code");
  });

  it("uses iOS-friendly autofill attributes", () => {
    render(<LoginPage onAuthenticated={vi.fn()} />);
    expect(screen.getByLabelText("password").getAttribute("autocomplete")).toBe("current-password");
    const code = screen.getByLabelText("authenticator code");
    expect(code.getAttribute("autocomplete")).toBe("one-time-code");
    expect(code.getAttribute("inputmode")).toBe("numeric");
  });
});
