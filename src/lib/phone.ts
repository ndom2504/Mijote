/**
 * Validation de numéros de téléphone (format E.164), sans dépendance externe.
 * Le format est vérifié ici ; la joignabilité réelle est vérifiée par Twilio Verify.
 * Une copie identique de cette logique vit dans `mobile/src/auth/phone.ts` ; un test garde les deux alignées.
 */

export type PhoneError = "invalid_dial" | "invalid_chars" | "too_short" | "too_long" | "invalid_nanp";

export type PhoneResult = { ok: true; e164: string } | { ok: false; error: PhoneError };

/** Indicatifs où le zéro initial fait partie du numéro national. */
const KEEPS_LEADING_ZERO = new Set(["39"]);

export function normalizePhone(dialCode: string, national: string): PhoneResult {
  const dial = dialCode.replace(/^\+/, "").trim();
  if (!/^[1-9]\d{0,2}$/.test(dial)) return { ok: false, error: "invalid_dial" };
  const raw = national.trim();
  if (!/^[\d\s().\-]*$/.test(raw)) return { ok: false, error: "invalid_chars" };
  let digits = raw.replace(/\D/g, "");

  if (dial === "1") {
    if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
    if (digits.length < 10) return { ok: false, error: "too_short" };
    if (digits.length > 10) return { ok: false, error: "too_long" };
    if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(digits)) return { ok: false, error: "invalid_nanp" };
    return { ok: true, e164: `+1${digits}` };
  }

  if (digits.startsWith("0") && !KEEPS_LEADING_ZERO.has(dial)) digits = digits.replace(/^0+/, "");
  if (digits.length < 4) return { ok: false, error: "too_short" };
  if (dial.length + digits.length > 15) return { ok: false, error: "too_long" };
  return { ok: true, e164: `+${dial}${digits}` };
}

/** Un numéro stocké ou reçu par l'API doit déjà être en E.164 strict. */
export function isValidE164(value: unknown): value is string {
  if (typeof value !== "string" || !/^\+[1-9]\d{6,14}$/.test(value)) return false;
  if (value.startsWith("+1")) return /^\+1[2-9]\d{2}[2-9]\d{6}$/.test(value);
  return true;
}

/** `+15145551234` devient `+1 ••• ••• 1234` : seuls les quatre derniers chiffres restent visibles. */
export function maskPhone(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  if (digits.length < 6) return "••••";
  const tail = digits.slice(-4);
  if (e164.startsWith("+1")) return `+1 ••• ••• ${tail}`;
  return `+${"•".repeat(digits.length - 4)} ${tail}`;
}
