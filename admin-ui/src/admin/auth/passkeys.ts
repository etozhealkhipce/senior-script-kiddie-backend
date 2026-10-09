import { browserSupportsWebAuthn, startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { authApi, type AuthResult, type PasskeyView } from "./api";

export const passkeysSupported = (): boolean => browserSupportsWebAuthn();

export function defaultPasskeyName(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Macintosh/.test(ua)) return "Mac";
  if (/Android/.test(ua)) return "Android";
  return "Passkey";
}

export async function signInWithPasskey(): Promise<AuthResult> {
  const optionsJSON = await authApi.passkeyLoginOptions();
  const response = await startAuthentication({ optionsJSON });
  return authApi.passkeyLoginVerify(response);
}

export async function registerPasskey(token: string, name: string): Promise<PasskeyView> {
  const optionsJSON = await authApi.passkeyRegisterOptions(token);
  const response = await startRegistration({ optionsJSON });
  return authApi.passkeyRegisterVerify(token, response, name);
}
