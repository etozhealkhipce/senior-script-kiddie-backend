import { type FC, type FormEvent, useState } from "react";
import { Button, Divider, Field } from "../../ui";
import { type AuthResult, authApi, describeAuthError } from "../auth/api";
import { passkeysSupported, signInWithPasskey } from "../auth/passkeys";
import { AuthLayout } from "../components/AuthLayout";

type Busy = "passkey" | "password" | null;

export const LoginPage: FC<{
  onAuthenticated: (result: AuthResult) => void;
}> = ({ onAuthenticated }) => {
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<Busy>(null);
  const canUsePasskey = passkeysSupported();

  const run = async (kind: Exclude<Busy, null>, action: () => Promise<AuthResult>) => {
    setError("");
    setBusy(kind);
    try {
      onAuthenticated(await action());
    } catch (e) {
      setError(describeAuthError(e));
    } finally {
      setBusy(null);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run("password", () => authApi.login(password, code));
  };

  return (
    <AuthLayout title="sign in" subtitle="sskd / admin">
      {canUsePasskey && (
        <>
          <Button
            variant="primary"
            block
            loading={busy === "passkey"}
            disabled={busy !== null}
            onClick={() => void run("passkey", signInWithPasskey)}
          >
            sign in with face id
          </Button>
          <div className="auth-or">
            <Divider />
            <span>or</span>
            <Divider />
          </div>
        </>
      )}

      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field
          label="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus={!canUsePasskey}
        />
        <Field
          label="authenticator code"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123 456"
          hint="leave empty on first sign-in"
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
          block
          loading={busy === "password"}
          disabled={busy !== null || !password}
        >
          continue &gt;
        </Button>
      </form>
    </AuthLayout>
  );
};
