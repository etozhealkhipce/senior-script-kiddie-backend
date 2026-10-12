import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const listPasskeys = vi.fn();
const deletePasskey = vi.fn();
const changePassword = vi.fn();
const resetTotp = vi.fn();
const confirmTotp = vi.fn();

vi.mock("../auth/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../auth/api")>();
  return {
    ...actual,
    authApi: {
      ...actual.authApi,
      listPasskeys: (...a: unknown[]) => listPasskeys(...a),
      deletePasskey: (...a: unknown[]) => deletePasskey(...a),
      changePassword: (...a: unknown[]) => changePassword(...a),
      resetTotp: (...a: unknown[]) => resetTotp(...a),
      confirmTotp: (...a: unknown[]) => confirmTotp(...a),
    },
  };
});
vi.mock("../auth/passkeys", () => ({
  passkeysSupported: () => true,
  defaultPasskeyName: () => "Mac",
  registerPasskey: vi.fn(),
}));

import { ConfirmProvider } from "../../ui";
import { ApiError } from "../auth/api";
import { SettingsPage } from "./SettingsPage";

const passkey = {
  id: "k1",
  name: "iPhone",
  createdAt: "2026-10-01T00:00:00Z",
  lastUsedAt: null,
};
const totp = { secret: "JBSWY3DPEHPK3PXP", otpauthUri: "otpauth://totp/test" };

async function renderSettings() {
  const props = { token: "t", onExpired: vi.fn(), onLogoutEverywhere: vi.fn() };
  await act(async () => {
    render(
      <ConfirmProvider>
        <SettingsPage {...props} />
      </ConfirmProvider>,
    );
  });
  return props;
}

/** The open confirmation dialog; buttons outside it share names with the page's own actions. */
function dialogScope() {
  return within(document.querySelector("dialog") as HTMLElement);
}

describe("SettingsPage", () => {
  beforeEach(() => {
    listPasskeys.mockReset().mockResolvedValue([passkey]);
    deletePasskey.mockReset().mockResolvedValue(undefined);
    changePassword.mockReset().mockResolvedValue(undefined);
    resetTotp.mockReset().mockResolvedValue(totp);
    confirmTotp.mockReset().mockResolvedValue(undefined);
  });

  it("lists passkeys", async () => {
    await renderSettings();
    expect(screen.getByText("iPhone")).toBeTruthy();
  });

  it("removes a passkey only after confirmation", async () => {
    await renderSettings();
    listPasskeys.mockResolvedValue([]);
    fireEvent.click(screen.getByRole("button", { name: "remove" }));
    await act(async () => {
      fireEvent.click(dialogScope().getByRole("button", { name: "remove" }));
    });
    expect(deletePasskey).toHaveBeenCalledWith("t", "k1");
    expect(screen.queryByText("iPhone")).toBeNull();
  });

  it("keeps a passkey when the removal is cancelled", async () => {
    await renderSettings();
    fireEvent.click(screen.getByRole("button", { name: "remove" }));
    await act(async () => {
      fireEvent.click(dialogScope().getByRole("button", { name: "cancel" }));
    });
    expect(deletePasskey).not.toHaveBeenCalled();
    expect(screen.getByText("iPhone")).toBeTruthy();
  });

  it("changes the password with a code and refuses mismatches locally", async () => {
    await renderSettings();
    fireEvent.change(screen.getByLabelText("new password"), {
      target: { value: "new-password-1" },
    });
    fireEvent.change(screen.getByLabelText("repeat password"), {
      target: { value: "different-1" },
    });
    fireEvent.change(screen.getByLabelText("authenticator code"), {
      target: { value: "123456" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "change password" }));
    });
    expect(changePassword).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("repeat password"), {
      target: { value: "new-password-1" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "change password" }));
    });
    expect(changePassword).toHaveBeenCalledWith("t", "new-password-1", "123456");
  });

  it("re-enrolls the authenticator: reset, show the secret, then confirm", async () => {
    await renderSettings();
    fireEvent.change(screen.getByLabelText("current password"), {
      target: { value: "pw-1" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "set up a new authenticator" }));
    });
    expect(resetTotp).toHaveBeenCalledWith("t", "pw-1");
    expect(screen.getByText("JBSW Y3DP EHPK 3PXP")).toBeTruthy();
    expect(screen.queryByLabelText("current password")).toBeNull();

    fireEvent.change(screen.getByLabelText("code from the new app"), {
      target: { value: "654321" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "confirm" }));
    });
    expect(confirmTotp).toHaveBeenCalledWith("t", "654321");
    expect(screen.getByRole("button", { name: "set up a new authenticator" })).toBeTruthy();
    expect(screen.queryByText("JBSW Y3DP EHPK 3PXP")).toBeNull();
  });

  it("cancelling re-enrollment returns to the start and clears the code", async () => {
    await renderSettings();
    fireEvent.change(screen.getByLabelText("current password"), {
      target: { value: "pw-1" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "set up a new authenticator" }));
    });
    fireEvent.change(screen.getByLabelText("code from the new app"), {
      target: { value: "111111" },
    });
    fireEvent.click(screen.getByRole("button", { name: "cancel" }));
    expect(screen.queryByText("JBSW Y3DP EHPK 3PXP")).toBeNull();
    expect(screen.getByLabelText("current password")).toHaveProperty("value", "");

    fireEvent.change(screen.getByLabelText("current password"), {
      target: { value: "pw-2" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "set up a new authenticator" }));
    });
    expect(screen.getByLabelText("code from the new app")).toHaveProperty("value", "");
    expect(confirmTotp).not.toHaveBeenCalled();
  });

  it("signs out everywhere after confirmation", async () => {
    const props = await renderSettings();
    fireEvent.click(screen.getByRole("button", { name: "sign out everywhere" }));
    await act(async () => {
      fireEvent.click(dialogScope().getByRole("button", { name: "sign out" }));
    });
    expect(props.onLogoutEverywhere).toHaveBeenCalled();
  });

  it("does not sign out when the confirmation is cancelled", async () => {
    const props = await renderSettings();
    fireEvent.click(screen.getByRole("button", { name: "sign out everywhere" }));
    await act(async () => {
      fireEvent.click(dialogScope().getByRole("button", { name: "cancel" }));
    });
    expect(props.onLogoutEverywhere).not.toHaveBeenCalled();
  });

  it("hands an expired session back to sign-in", async () => {
    listPasskeys.mockReset().mockRejectedValue(new ApiError(401, "expired"));
    const props = await renderSettings();
    expect(props.onExpired).toHaveBeenCalled();
  });
});
