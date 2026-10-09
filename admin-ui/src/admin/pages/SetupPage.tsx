import { sileo } from "sileo";
import { type FC, type FormEvent, useEffect, useState } from "react";
import { ApiError, authApi, describeAuthError, type AuthResult, type TotpSetup } from "../auth/api";
import { defaultPasskeyName, passkeysSupported, registerPasskey } from "../auth/passkeys";
import { TotpQr } from "../components/TotpQr";

interface SetupPageProps {
  token: string;
  onDone: (result: AuthResult) => void;
  onExpired: () => void;
}

export const SetupPage: FC<SetupPageProps> = ({ token, onDone, onExpired }) => {
  const [totp, setTotp] = useState<TotpSetup | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [fullSession, setFullSession] = useState<AuthResult | null>(null);

  useEffect(() => {
    authApi.getSetup(token).then(setTotp).catch((e) => {
      if (e instanceof ApiError && e.status === 401) onExpired();
      else setError(describeAuthError(e));
    });
  }, [token, onExpired]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    setError("");
    setBusy(true);
    try {
      const result = await authApi.completeSetup(token, password, code);
      if (passkeysSupported()) setFullSession(result);
      else onDone(result);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) onExpired();
      else setError(describeAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const addPasskey = async () => {
    if (!fullSession) return;
    setError("");
    setBusy(true);
    try {
      await registerPasskey(fullSession.token, defaultPasskeyName());
      sileo.success({ title: "Face ID added" });
      onDone(fullSession);
    } catch (err) {
      setError(describeAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adm-login-stage">
      <div className="adm-login-card">
        {fullSession ? (
          <>
            <p className="font-semibold text-[15px] text-content mb-1">Add Face ID?</p>
            <p className="text-[12.5px] text-faint mb-5">
              Next time you can sign in with one tap instead of the password and code.
            </p>
            {error && <p className="text-xs text-error mb-2">{error}</p>}
            <button onClick={addPasskey} disabled={busy} className="adm-login-btn mb-2">
              Add Face ID / Touch ID
            </button>
            <button onClick={() => onDone(fullSession)} disabled={busy} className="adm-btn adm-btn-ghost w-full">
              Skip for now
            </button>
          </>
        ) : (
          <form onSubmit={submit}>
            <p className="font-semibold text-[15px] text-content mb-1">First-time setup</p>
            <p className="text-[12.5px] text-faint mb-5">Replace the default password and connect an authenticator app.</p>

            <label className="text-xs text-muted font-medium mb-[7px] block">New password</label>
            <input type="password" autoComplete="new-password" value={password}
              onChange={(e) => setPassword(e.target.value)} className="adm-token-input mb-3" autoFocus />
            <label className="text-xs text-muted font-medium mb-[7px] block">Repeat password</label>
            <input type="password" autoComplete="new-password" value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)} className="adm-token-input mb-3" />

            <p className="text-xs text-muted font-medium">Scan with Authy or any authenticator app</p>
            {totp ? <TotpQr totp={totp} /> : <p className="text-xs text-faint my-3">Loading…</p>}

            <label className="text-xs text-muted font-medium mb-[7px] block">Code from the app</label>
            <input inputMode="numeric" autoComplete="one-time-code" placeholder="123 456" value={code}
              onChange={(e) => setCode(e.target.value)} className="adm-token-input mb-3" />

            {error && <p className="text-xs text-error mb-2">{error}</p>}
            <button type="submit" disabled={busy || !totp || !password || !code} className="adm-login-btn">
              Finish setup
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
