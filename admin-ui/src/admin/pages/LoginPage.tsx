import { type FC } from "react";

interface LoginPageProps {
  inputToken: string;
  authError: string;
  onTokenChange: (v: string) => void;
  onLogin: () => void;
}

export const LoginPage: FC<LoginPageProps> = ({ inputToken, authError, onTokenChange, onLogin }) => (
  <div className="adm-login-stage">
    <div className="adm-login-card">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div className="adm-brand-mark" style={{ width: 38, height: 38, borderRadius: 9, fontSize: 17 }}>
          s
        </div>
        <div>
          <p style={{ fontWeight: 600, fontSize: 15, letterSpacing: "-0.01em", color: "var(--text)" }}>
            <b>sskd</b>
            <span style={{ color: "var(--text-ghost)", margin: "0 5px", fontWeight: 400 }}>/</span>
            <b>admin</b>
          </p>
          <p style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 2 }}>Sign in to continue</p>
        </div>
      </div>

      <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500, marginBottom: 7, display: "block" }}>
        Access token
      </label>
      <input
        type="password"
        placeholder="Paste your token…"
        value={inputToken}
        onChange={(e) => onTokenChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onLogin()}
        autoFocus
        className="adm-token-input"
      />
      {authError && (
        <p style={{ fontSize: 12, color: "oklch(0.55 0.18 25)", marginBottom: 8 }}>{authError}</p>
      )}
      <button onClick={onLogin} disabled={!inputToken.trim()} className="adm-login-btn">
        Continue →
      </button>
    </div>
  </div>
);
