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

      <label className="text-xs text-muted font-medium mb-[7px] block">
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
        <p className="text-xs text-error mb-2">{authError}</p>
      )}
      <button onClick={onLogin} disabled={!inputToken.trim()} className="adm-login-btn">
        Continue →
      </button>
    </div>
  </div>
);
