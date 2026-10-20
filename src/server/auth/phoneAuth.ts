import { isValidE164 } from "@/lib/phone";
import { phoneLimits } from "@/server/auth/config";
import { loginWithPhone, linkIdentity, type IdentityLogin } from "@/server/auth/identity";
import { clearAttempts, consumeAttempt, pruneAttempts, throttleKey } from "@/server/auth/throttle";
import { getPhoneVerifier } from "@/server/auth/twilio";

type Limited = { ok: false; error: "rate_limited"; retryAfterSeconds: number };
type CodeFailure = "invalid_phone" | "invalid_code" | "expired" | "phone_unavailable" | "provider_error";

export type PhoneStart =
  | { ok: true; resendAfterSeconds: number }
  | { ok: false; error: "invalid_phone" | "phone_unavailable" | "sms_unsupported" | "provider_error" }
  | Limited;

export type PhoneCheck =
  | { ok: true; login: Extract<IdentityLogin, { ok: true }> }
  | { ok: false; error: CodeFailure | "account_unavailable" }
  | Limited;

export type PhoneLink =
  | { ok: true; alreadyLinked: boolean }
  | { ok: false; error: CodeFailure | "identity_in_use" }
  | Limited;

interface Context {
  ip: string;
  now?: Date;
}

/**
 * Envoie un code par SMS (Twilio Verify). La réponse est identique que le numéro ait déjà un compte ou non :
 * l'existence d'un compte n'est jamais consultée à cette étape.
 */
export async function startPhoneVerification(phone: unknown, context: Context): Promise<PhoneStart> {
  if (!isValidE164(phone)) return { ok: false, error: "invalid_phone" };
  const verifier = getPhoneVerifier();
  if (!verifier) return { ok: false, error: "phone_unavailable" };

  const limits = phoneLimits();
  const now = context.now ?? new Date();
  const cooldown = await consumeAttempt(throttleKey("phone-cooldown", phone), 1, limits.resendSeconds, now);
  if (!cooldown.ok) return { ok: false, error: "rate_limited", retryAfterSeconds: cooldown.retryAfterSeconds };
  const hourly = await consumeAttempt(throttleKey("phone-send", phone), limits.sendsPerHour, 3600, now);
  if (!hourly.ok) return { ok: false, error: "rate_limited", retryAfterSeconds: hourly.retryAfterSeconds };
  const byIp = await consumeAttempt(throttleKey("phone-send-ip", context.ip), limits.sendsPerHourPerIp, 3600, now);
  if (!byIp.ok) return { ok: false, error: "rate_limited", retryAfterSeconds: byIp.retryAfterSeconds };
  await pruneAttempts(now);

  const sent = await verifier.start(phone);
  if (!sent.ok) {
    if (sent.error === "rate_limited") return { ok: false, error: "rate_limited", retryAfterSeconds: limits.resendSeconds * 4 };
    return { ok: false, error: sent.error };
  }
  return { ok: true, resendAfterSeconds: limits.resendSeconds };
}

type Checked = { kind: "verified"; phone: string } | { kind: "failed"; error: CodeFailure } | { kind: "limited"; retryAfterSeconds: number };

async function checkCode(phone: unknown, code: unknown, context: Context): Promise<Checked> {
  if (!isValidE164(phone)) return { kind: "failed", error: "invalid_phone" };
  if (typeof code !== "string" || !/^\d{6}$/.test(code)) return { kind: "failed", error: "invalid_code" };
  const verifier = getPhoneVerifier();
  if (!verifier) return { kind: "failed", error: "phone_unavailable" };

  const limits = phoneLimits();
  const now = context.now ?? new Date();
  const checkKey = throttleKey("phone-check", phone);
  const byPhone = await consumeAttempt(checkKey, limits.checksPerWindow, limits.checkWindowSeconds, now);
  if (!byPhone.ok) return { kind: "limited", retryAfterSeconds: byPhone.retryAfterSeconds };
  const byIp = await consumeAttempt(throttleKey("phone-check-ip", context.ip), limits.checksPerWindowPerIp, limits.checkWindowSeconds, now);
  if (!byIp.ok) return { kind: "limited", retryAfterSeconds: byIp.retryAfterSeconds };

  const result = await verifier.check(phone, code);
  if (!result.ok) {
    if (result.error === "too_many_attempts") return { kind: "limited", retryAfterSeconds: limits.checkWindowSeconds };
    return { kind: "failed", error: result.error };
  }
  await clearAttempts(checkKey);
  await clearAttempts(throttleKey("phone-cooldown", phone));
  return { kind: "verified", phone };
}

/** Valide le code auprès de Twilio, puis crée ou retrouve le compte et ouvre une session. */
export async function verifyPhoneLogin(phone: unknown, code: unknown, context: Context): Promise<PhoneCheck> {
  const checked = await checkCode(phone, code, context);
  if (checked.kind === "limited") return { ok: false, error: "rate_limited", retryAfterSeconds: checked.retryAfterSeconds };
  if (checked.kind === "failed") return { ok: false, error: checked.error };
  const login = await loginWithPhone(checked.phone);
  return login.ok ? { ok: true, login } : { ok: false, error: "account_unavailable" };
}

/** Ajoute un numéro vérifié au compte d'un utilisateur déjà connecté. */
export async function verifyPhoneLink(userId: string, phone: unknown, code: unknown, context: Context): Promise<PhoneLink> {
  const checked = await checkCode(phone, code, context);
  if (checked.kind === "limited") return { ok: false, error: "rate_limited", retryAfterSeconds: checked.retryAfterSeconds };
  if (checked.kind === "failed") return { ok: false, error: checked.error };
  const linked = await linkIdentity(userId, "phone", checked.phone, null);
  return linked.ok ? { ok: true, alreadyLinked: linked.alreadyLinked } : { ok: false, error: linked.error };
}
