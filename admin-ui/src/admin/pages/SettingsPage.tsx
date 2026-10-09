import { sileo } from "sileo";
import { type FC, type FormEvent, useCallback, useEffect, useState } from "react";
import { ApiError, authApi, describeAuthError, type PasskeyView, type TotpSetup } from "../auth/api";
import { defaultPasskeyName, passkeysSupported, registerPasskey } from "../auth/passkeys";
import { TotpQr } from "../components/TotpQr";
import { formatDate } from "../utils";

interface SettingsPageProps {
  token: string;
  onExpired: () => void;
  onLogoutEverywhere: () => void;
}

const sectionTitle = "font-semibold text-[14.5px] text-content mb-1";
const sectionHint = "text-[12.5px] text-faint mb-3";
const label = "text-xs text-muted font-medium mb-[7px] block";

export const SettingsPage: FC<SettingsPageProps> = ({ token, onExpired, onLogoutEverywhere }) => {
  const [busy, setBusy] = useState(false);
  const [passkeys, setPasskeys] = useState<PasskeyView[]>([]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordCode, setPasswordCode] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [pendingTotp, setPendingTotp] = useState<TotpSetup | null>(null);
  const [totpCode, setTotpCode] = useState("");

  const guarded = useCallback(async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) onExpired();
      else sileo.error({ title: describeAuthError(e) });
    } finally {
      setBusy(false);
    }
  }, [onExpired]);

  const loadPasskeys = useCallback(
    () => guarded(async () => setPasskeys(await authApi.listPasskeys(token))),
    [guarded, token],
  );

  useEffect(() => { loadPasskeys(); }, [loadPasskeys]);

  const addPasskey = () => guarded(async () => {
    await registerPasskey(token, defaultPasskeyName());
    sileo.success({ title: "Passkey added" });
    setPasskeys(await authApi.listPasskeys(token));
  });

  const removePasskey = (p: PasskeyView) => {
    if (!confirm(`Remove passkey "${p.name}"?`)) return;
    guarded(async () => {
      await authApi.deletePasskey(token, p.id);
      setPasskeys(await authApi.listPasskeys(token));
    });
  };

  const changePassword = (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { sileo.error({ title: "Passwords do not match" }); return; }
    guarded(async () => {
      await authApi.changePassword(token, newPassword, passwordCode);
      setNewPassword(""); setConfirmPassword(""); setPasswordCode("");
      sileo.success({ title: "Password changed" });
    });
  };

  const startTotpReset = (e: FormEvent) => {
    e.preventDefault();
    guarded(async () => {
      setPendingTotp(await authApi.resetTotp(token, currentPassword));
      setCurrentPassword("");
    });
  };

  const confirmTotp = (e: FormEvent) => {
    e.preventDefault();
    guarded(async () => {
      await authApi.confirmTotp(token, totpCode);
      setPendingTotp(null); setTotpCode("");
      sileo.success({ title: "Authenticator updated" });
    });
  };

  return (
    <div className="adm-main-inner max-w-[560px]">
      <div className="adm-page-head">
        <h1 className="adm-page-title">Settings</h1>
      </div>

      <section className="mb-8">
        <h2 className={sectionTitle}>Face ID / Touch ID</h2>
        <p className={sectionHint}>Passkeys sync through iCloud Keychain, so one is usually enough for all your Apple devices.</p>
        {passkeys.length === 0 && <p className="text-[13px] text-faint mb-3">No passkeys yet.</p>}
        {passkeys.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-3 py-2 border-b border-line-soft">
            <div>
              <p className="text-[13.5px] text-content">{p.name}</p>
              <p className="text-[12px] text-faint">
                added {formatDate(p.createdAt)}
                {p.lastUsedAt && ` · last used ${formatDate(p.lastUsedAt)}`}
              </p>
            </div>
            <button className="adm-btn adm-btn-ghost" disabled={busy} onClick={() => removePasskey(p)}>Remove</button>
          </div>
        ))}
        {passkeysSupported() && (
          <button className="adm-btn adm-btn-primary mt-3" disabled={busy} onClick={addPasskey}>
            Add passkey on this device
          </button>
        )}
      </section>

      <section className="mb-8">
        <h2 className={sectionTitle}>Password</h2>
        <p className={sectionHint}>Needs a code from your authenticator app.</p>
        <form onSubmit={changePassword}>
          <label className={label}>New password</label>
          <input type="password" autoComplete="new-password" value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)} className="adm-token-input mb-3" />
          <label className={label}>Repeat password</label>
          <input type="password" autoComplete="new-password" value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)} className="adm-token-input mb-3" />
          <label className={label}>Authenticator code</label>
          <input inputMode="numeric" autoComplete="one-time-code" value={passwordCode}
            onChange={(e) => setPasswordCode(e.target.value)} className="adm-token-input mb-3" />
          <button type="submit" className="adm-btn adm-btn-primary"
            disabled={busy || !newPassword || !passwordCode}>Change password</button>
        </form>
      </section>

      <section className="mb-8">
        <h2 className={sectionTitle}>Authenticator app</h2>
        {pendingTotp ? (
          <form onSubmit={confirmTotp}>
            <p className={sectionHint}>Scan the new code, then enter a code from it. Until you confirm, the old app keeps working.</p>
            <TotpQr totp={pendingTotp} />
            <label className={label}>Code from the new app</label>
            <input inputMode="numeric" autoComplete="one-time-code" value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)} className="adm-token-input mb-3" />
            <div className="flex gap-2">
              <button type="submit" className="adm-btn adm-btn-primary" disabled={busy || !totpCode}>Confirm</button>
              <button type="button" className="adm-btn adm-btn-ghost" onClick={() => setPendingTotp(null)}>Cancel</button>
            </div>
          </form>
        ) : (
          <form onSubmit={startTotpReset}>
            <p className={sectionHint}>Lost the app or moving to a new one? Confirm with your password.</p>
            <label className={label}>Current password</label>
            <input type="password" autoComplete="current-password" value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)} className="adm-token-input mb-3" />
            <button type="submit" className="adm-btn adm-btn-primary" disabled={busy || !currentPassword}>
              Set up a new authenticator
            </button>
          </form>
        )}
      </section>

      <section className="mb-8">
        <h2 className={sectionTitle}>Sessions</h2>
        <p className={sectionHint}>Signs out every device, including this one.</p>
        <button className="adm-btn adm-btn-ghost" disabled={busy}
          onClick={() => { if (confirm("Sign out on all devices?")) onLogoutEverywhere(); }}>
          Sign out everywhere
        </button>
      </section>
    </div>
  );
};
