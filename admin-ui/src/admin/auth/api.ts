import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/browser";

export type SessionKind = "full" | "setup";
export type AuthResult = { token: string; kind: SessionKind };
export type TotpSetup = { secret: string; otpauthUri: string };
export type PasskeyView = { id: string; name: string; createdAt: string; lastUsedAt: string | null };

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export function describeAuthError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.message === "Unknown passkey") {
      return "This passkey is no longer registered — sign in with your password and code";
    }
    return e.message;
  }
  if (e instanceof Error && e.name === "NotAllowedError") return "Face ID was cancelled or timed out";
  return e instanceof Error ? e.message : String(e);
}

type RequestOptions = { token?: string; method?: string; json?: unknown };

async function request<T>(path: string, { token, method, json }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers["x-admin-token"] = token;
  if (json !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`/api/admin/auth${path}`, {
    method: method ?? (json !== undefined ? "POST" : "GET"),
    headers,
    body: json !== undefined ? JSON.stringify(json) : undefined,
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    const message = Array.isArray(b.message) ? b.message.join(", ") : b.message ?? `HTTP ${res.status}`;
    throw new ApiError(res.status, message);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export const authApi = {
  login: (password: string, code: string) =>
    request<AuthResult>("/login", { json: { password, code: code.trim() || undefined } }),
  getSetup: (token: string) => request<TotpSetup>("/setup", { token }),
  completeSetup: (token: string, newPassword: string, code: string) =>
    request<AuthResult>("/setup", { token, json: { newPassword, code } }),

  passkeyLoginOptions: () =>
    request<PublicKeyCredentialRequestOptionsJSON>("/passkey/login/options", { method: "POST" }),
  passkeyLoginVerify: (response: AuthenticationResponseJSON) =>
    request<AuthResult>("/passkey/login/verify", { json: { response } }),
  passkeyRegisterOptions: (token: string) =>
    request<PublicKeyCredentialCreationOptionsJSON>("/passkey/register/options", { token, method: "POST" }),
  passkeyRegisterVerify: (token: string, response: RegistrationResponseJSON, name: string) =>
    request<PasskeyView>("/passkey/register/verify", { token, json: { response, name } }),
  listPasskeys: (token: string) => request<PasskeyView[]>("/passkeys", { token }),
  deletePasskey: (token: string, id: string) =>
    request<void>(`/passkeys/${encodeURIComponent(id)}`, { token, method: "DELETE" }),

  changePassword: (token: string, newPassword: string, code: string) =>
    request<void>("/password", { token, json: { newPassword, code } }),
  resetTotp: (token: string, currentPassword: string) =>
    request<TotpSetup>("/totp/reset", { token, json: { currentPassword } }),
  confirmTotp: (token: string, code: string) => request<void>("/totp/confirm", { token, json: { code } }),

  logout: (token: string) => request<void>("/logout", { token, method: "POST" }),
  logoutAll: (token: string) => request<void>("/logout-all", { token, method: "POST" }),
};
