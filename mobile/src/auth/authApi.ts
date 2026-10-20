import { request } from "../data/client";

export interface ProvidersStatus {
  google: boolean;
  phone: boolean;
  resendSeconds: number;
  codeLength: number;
}

export interface LoginResult {
  token: string;
  isNewUser: boolean;
}

/** Indique quels fournisseurs le serveur a réellement configurés (booléens seulement, aucun secret). */
export function fetchProviders(base: string): Promise<ProvidersStatus> {
  return request<ProvidersStatus>(base, "/api/auth/providers");
}

export function loginWithGoogleToken(base: string, idToken: string): Promise<LoginResult> {
  return request<LoginResult>(base, "/api/auth/google", { method: "POST", body: { idToken } });
}

export function sendPhoneCode(base: string, phone: string): Promise<{ ok: true; resendAfterSeconds: number }> {
  return request(base, "/api/auth/phone-start", { method: "POST", body: { phone } });
}

export function verifyPhoneCode(base: string, phone: string, code: string): Promise<LoginResult> {
  return request<LoginResult>(base, "/api/auth/phone-verify", { method: "POST", body: { phone, code } });
}
