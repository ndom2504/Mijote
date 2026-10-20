import { twilioConfig, type TwilioConfig } from "@/server/auth/config";

export type StartResult =
  | { ok: true }
  | { ok: false; error: "invalid_phone" | "sms_unsupported" | "rate_limited" | "provider_error" };

export type CheckResult =
  | { ok: true }
  | { ok: false; error: "invalid_code" | "expired" | "too_many_attempts" | "provider_error" };

/** Frontière vers le fournisseur de SMS : remplaçable dans les tests, sans appel réseau. */
export interface PhoneVerifier {
  start(phone: string): Promise<StartResult>;
  check(phone: string, code: string): Promise<CheckResult>;
}

type Fetch = typeof fetch;

const BASE = "https://verify.twilio.com/v2/Services";
const TIMEOUT_MS = 10_000;

async function call(config: TwilioConfig, path: string, form: Record<string, string>, fetchImpl: Fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetchImpl(`${BASE}/${config.serviceSid}/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(form).toString(),
      signal: controller.signal,
    });
    const data = (await response.json().catch(() => ({}))) as { status?: string; code?: number };
    return { status: response.status, body: data };
  } finally {
    clearTimeout(timer);
  }
}

/** Twilio Verify par l'API REST : aucun SDK, aucun identifiant dans l'application mobile. */
export function createTwilioVerifier(config: TwilioConfig, fetchImpl: Fetch = fetch): PhoneVerifier {
  return {
    async start(phone) {
      try {
        const { status, body } = await call(config, "Verifications", { To: phone, Channel: "sms", Locale: "fr" }, fetchImpl);
        if (status >= 200 && status < 300) return { ok: true };
        if (status === 429 || body.code === 60203) return { ok: false, error: "rate_limited" };
        if (body.code === 60205) return { ok: false, error: "sms_unsupported" };
        if (status === 400 || body.code === 60200) return { ok: false, error: "invalid_phone" };
        return { ok: false, error: "provider_error" };
      } catch {
        return { ok: false, error: "provider_error" };
      }
    },
    async check(phone, code) {
      try {
        const { status, body } = await call(config, "VerificationCheck", { To: phone, Code: code }, fetchImpl);
        if (status >= 200 && status < 300) return body.status === "approved" ? { ok: true } : { ok: false, error: "invalid_code" };
        if (status === 404) return { ok: false, error: "expired" };
        if (status === 429 || body.code === 60202) return { ok: false, error: "too_many_attempts" };
        if (status === 400) return { ok: false, error: "invalid_code" };
        return { ok: false, error: "provider_error" };
      } catch {
        return { ok: false, error: "provider_error" };
      }
    },
  };
}

let override: PhoneVerifier | null | undefined;

/** Réservé aux tests : impose un fournisseur factice (ou `null` pour simuler l'absence de configuration). */
export function setPhoneVerifier(verifier: PhoneVerifier | null | undefined) {
  override = verifier;
}

export function getPhoneVerifier(): PhoneVerifier | null {
  if (override !== undefined) return override;
  const config = twilioConfig();
  return config ? createTwilioVerifier(config) : null;
}
