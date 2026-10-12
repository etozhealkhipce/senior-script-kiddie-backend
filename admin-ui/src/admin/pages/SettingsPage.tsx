import { type FC, type FormEvent, useCallback, useEffect, useState } from "react";
import { Button, Divider, Field, toast, useConfirm } from "../../ui";
import {
  ApiError,
  authApi,
  describeAuthError,
  type PasskeyView,
  type TotpSetup,
} from "../auth/api";
import { defaultPasskeyName, passkeysSupported, registerPasskey } from "../auth/passkeys";
import { TotpQr } from "../components/TotpQr";
import { formatDate } from "../utils";

type SettingsPageProps = {
  token: string;
  onExpired: () => void;
  onLogoutEverywhere: () => void;
};

export const SettingsPage: FC<SettingsPageProps> = ({ token, onExpired, onLogoutEverywhere }) => {
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const [passkeys, setPasskeys] = useState<PasskeyView[]>([]);
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [passwordCode, setPasswordCode] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [pendingTotp, setPendingTotp] = useState<TotpSetup | null>(null);
  const [totpCode, setTotpCode] = useState("");

  const guarded = useCallback(
    async (action: () => Promise<void>) => {
      setBusy(true);
      try {
        await action();
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) onExpired();
        else toast.error(describeAuthError(e));
      } finally {
        setBusy(false);
      }
    },
    [onExpired],
  );

  const reload = useCallback(
    () => guarded(async () => setPasskeys(await authApi.listPasskeys(token))),
    [guarded, token],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  const addPasskey = () =>
    guarded(async () => {
      await registerPasskey(token, defaultPasskeyName());
      toast.success("Passkey added");
      setPasskeys(await authApi.listPasskeys(token));
    });

  const removePasskey = async (p: PasskeyView) => {
    const ok = await confirm({
      title: `remove “${p.name}”?`,
      body: "this device will need the password and code again.",
      confirmLabel: "remove",
      danger: true,
    });
    if (!ok) return;
    await guarded(async () => {
      await authApi.deletePasskey(token, p.id);
      setPasskeys(await authApi.listPasskeys(token));
    });
  };

  const changePassword = (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== repeatPassword) {
      toast.error("Passwords do not match");
      return;
    }
    void guarded(async () => {
      await authApi.changePassword(token, newPassword, passwordCode);
      setNewPassword("");
      setRepeatPassword("");
      setPasswordCode("");
      toast.success("Password changed");
    });
  };

  const startTotpReset = (e: FormEvent) => {
    e.preventDefault();
    void guarded(async () => {
      setPendingTotp(await authApi.resetTotp(token, currentPassword));
      setCurrentPassword("");
    });
  };

  const confirmTotp = (e: FormEvent) => {
    e.preventDefault();
    void guarded(async () => {
      await authApi.confirmTotp(token, totpCode);
      setPendingTotp(null);
      setTotpCode("");
      toast.success("Authenticator updated");
    });
  };

  const signOutEverywhere = async () => {
    const ok = await confirm({
      title: "sign out everywhere?",
      body: "every device, including this one.",
      confirmLabel: "sign out",
      danger: true,
    });
    if (ok) onLogoutEverywhere();
  };

  return (
    <section className="page">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-medium lg:text-5xl">settings</h1>
        <p className="text-sm text-secondary">sign-in methods and sessions</p>
      </header>

      <section className="settings-section">
        <h2 className="settings-title">face id / touch id</h2>
        <p className="settings-hint">
          passkeys sync through icloud keychain — one is usually enough for every apple device.
        </p>
        {passkeys.length === 0 ? (
          <p className="text-sm text-neutral-500">no passkeys yet</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {passkeys.map((p) => (
              <li key={p.id} className="passkey-row">
                <div className="min-w-0">
                  <p className="break-words text-sm">{p.name}</p>
                  <p className="text-xs text-neutral-500">
                    added {formatDate(p.createdAt)}
                    {p.lastUsedAt && ` · last used ${formatDate(p.lastUsedAt)}`}
                  </p>
                </div>
                <Button variant="link-danger" disabled={busy} onClick={() => void removePasskey(p)}>
                  remove
                </Button>
              </li>
            ))}
          </ul>
        )}
        {passkeysSupported() && (
          <Button variant="primary" disabled={busy} onClick={() => void addPasskey()}>
            add passkey on this device
          </Button>
        )}
      </section>

      <Divider />

      <section className="settings-section">
        <h2 className="settings-title">password</h2>
        <p className="settings-hint">needs a code from your authenticator app.</p>
        <form onSubmit={changePassword} className="flex flex-col gap-4">
          <Field
            label="new password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Field
            label="repeat password"
            type="password"
            autoComplete="new-password"
            value={repeatPassword}
            onChange={(e) => setRepeatPassword(e.target.value)}
          />
          <Field
            label="authenticator code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={passwordCode}
            onChange={(e) => setPasswordCode(e.target.value)}
          />
          <Button type="submit" disabled={busy || !newPassword || !passwordCode}>
            change password
          </Button>
        </form>
      </section>

      <Divider />

      <section className="settings-section">
        <h2 className="settings-title">authenticator app</h2>
        {pendingTotp ? (
          <form onSubmit={confirmTotp} className="flex flex-col gap-4">
            <p className="settings-hint">
              scan the new code, then enter a code from it. the old app works until you confirm.
            </p>
            <TotpQr totp={pendingTotp} />
            <Field
              label="code from the new app"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="primary" disabled={busy || !totpCode}>
                confirm
              </Button>
              <Button
                onClick={() => {
                  setPendingTotp(null);
                  setTotpCode("");
                }}
                disabled={busy}
              >
                cancel
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={startTotpReset} className="flex flex-col gap-4">
            <p className="settings-hint">
              lost the app or moving to a new one? confirm with your password.
            </p>
            <Field
              label="current password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <Button type="submit" disabled={busy || !currentPassword}>
              set up a new authenticator
            </Button>
          </form>
        )}
      </section>

      <Divider />

      <section className="settings-section">
        <h2 className="settings-title">sessions</h2>
        <p className="settings-hint">signs out every device, including this one.</p>
        <Button variant="danger" disabled={busy} onClick={() => void signOutEverywhere()}>
          sign out everywhere
        </Button>
      </section>
    </section>
  );
};
