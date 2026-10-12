import { type FC, type FormEvent, useEffect, useState } from "react";
import { Button, Field, toast } from "../../ui";
import { ApiError, type AuthResult, authApi, describeAuthError, type TotpSetup } from "../auth/api";
import { defaultPasskeyName, passkeysSupported, registerPasskey } from "../auth/passkeys";
import { AuthLayout } from "../components/AuthLayout";
import { TotpQr } from "../components/TotpQr";

type SetupPageProps = {
  token: string;
  onDone: (result: AuthResult) => void;
  onExpired: () => void;
};

export const SetupPage: FC<SetupPageProps> = ({ token, onDone, onExpired }) => {
  const [totp, setTotp] = useState<TotpSetup | null>(null);
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [fullSession, setFullSession] = useState<AuthResult | null>(null);

  useEffect(() => {
    authApi
      .getSetup(token)
      .then(setTotp)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) onExpired();
        else setError(describeAuthError(e));
      });
  }, [token, onExpired]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== repeat) {
      setError("Passwords do not match");
      return;
    }
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
      toast.success("Face ID added");
      onDone(fullSession);
    } catch (err) {
      setError(describeAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  if (fullSession) {
    return (
      <AuthLayout title="add face id?" subtitle="next time sign in with one tap">
        {error && (
          <p role="alert" className="ui-error">
            {error}
          </p>
        )}
        <Button variant="primary" block loading={busy} onClick={() => void addPasskey()}>
          add face id
        </Button>
        <Button variant="link" disabled={busy} onClick={() => onDone(fullSession)}>
          skip for now
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="first-time setup" subtitle="new password + authenticator app">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field
          label="new password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        <Field
          label="repeat password"
          type="password"
          autoComplete="new-password"
          value={repeat}
          onChange={(e) => setRepeat(e.target.value)}
        />
        <p className="ui-label">scan with authy or any authenticator app</p>
        {totp ? <TotpQr totp={totp} /> : <p className="text-xs text-neutral-500">loading…</p>}
        <Field
          label="code from the app"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123 456"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        {error && (
          <p role="alert" className="ui-error">
            {error}
          </p>
        )}
        <Button
          type="submit"
          variant="primary"
          block
          loading={busy}
          disabled={!totp || !password || !code}
        >
          finish setup
        </Button>
      </form>
    </AuthLayout>
  );
};
