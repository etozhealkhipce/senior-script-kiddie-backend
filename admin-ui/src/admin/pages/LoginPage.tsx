import { ScanFace } from "lucide-react";
import { type FC, type FormEvent, useState } from "react";
import { authApi, describeAuthError, type AuthResult } from "../auth/api";
import { passkeysSupported, signInWithPasskey } from "../auth/passkeys";

interface LoginPageProps {
  onAuthenticated: (result: AuthResult) => void;
}

export const LoginPage: FC<LoginPageProps> = ({ onAuthenticated }) => {
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const canUsePasskey = passkeysSupported();

  const run = async (action: () => Promise<AuthResult>) => {
    setError("");
    setBusy(true);
    try {
      onAuthenticated(await action());
    } catch (e) {
      setError(describeAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    run(() => authApi.login(password, code));
  };

  return (
    <div className="adm-login-stage">
      <div className="adm-login-card">
        <div className="flex items-center gap-3 mb-6">
          <div className="adm-brand-mark w-[38px] h-[38px] rounded-[9px] text-[17px]">s</div>
          <div>
            <p className="font-semibold text-[15px] tracking-[-0.01em] text-content">
              <b>sskd</b>
              <span className="text-ghost mx-[5px] font-normal">/</span>
              <b>admin</b>
            </p>
            <p className="text-[12.5px] text-faint mt-0.5">Sign in to continue</p>
          </div>
        </div>

        {canUsePasskey && (
          <>
            <button
              onClick={() => run(signInWithPasskey)}
              disabled={busy}
              className="adm-login-btn flex items-center justify-center gap-2"
            >
              <ScanFace size={16} />
              Sign in with Face ID / Touch ID
            </button>
            <div className="flex items-center gap-3 my-4 text-[11.5px] text-faint">
              <div className="h-px flex-1 bg-line-soft" />
              or
              <div className="h-px flex-1 bg-line-soft" />
            </div>
          </>
        )}

        <form onSubmit={submit}>
          <label className="text-xs text-muted font-medium mb-[7px] block">Password</label>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus={!canUsePasskey}
            className="adm-token-input mb-3"
          />
          <label className="text-xs text-muted font-medium mb-[7px] block">Authenticator code</label>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123 456 — leave empty on first sign-in"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="adm-token-input mb-3"
          />
          {error && <p className="text-xs text-error mb-2">{error}</p>}
          <button type="submit" disabled={busy || !password} className="adm-login-btn">
            Continue →
          </button>
        </form>
      </div>
    </div>
  );
};
