/**
 * Configuration d'authentification Google et téléphone, lue depuis l'environnement du serveur.
 * Les secrets ne quittent jamais ce module : seuls des booléens sont exposés à l'application.
 */

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  serviceSid: string;
}

export interface PhoneLimits {
  resendSeconds: number;
  sendsPerHour: number;
  sendsPerHourPerIp: number;
  checksPerWindow: number;
  checkWindowSeconds: number;
  checksPerWindowPerIp: number;
}

function intFromEnv(name: string, fallback: number, min: number, max: number): number {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value >= min && value <= max ? value : fallback;
}

/** Identifiants OAuth acceptés comme audience (client web, et au besoin iOS), séparés par des virgules. */
export function googleClientIds(): string[] {
  return (process.env.GOOGLE_CLIENT_IDS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => /^[\w.-]+\.apps\.googleusercontent\.com$/.test(item));
}

export function twilioConfig(): TwilioConfig | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim() ?? "";
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim() ?? "";
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID?.trim() ?? "";
  if (!/^AC[0-9a-fA-F]{32}$/.test(accountSid)) return null;
  if (!/^VA[0-9a-fA-F]{32}$/.test(serviceSid)) return null;
  if (authToken.length < 16) return null;
  return { accountSid, authToken, serviceSid };
}

export function phoneLimits(): PhoneLimits {
  return {
    resendSeconds: intFromEnv("AUTH_PHONE_RESEND_SECONDS", 30, 5, 600),
    sendsPerHour: intFromEnv("AUTH_PHONE_SENDS_PER_HOUR", 5, 1, 50),
    sendsPerHourPerIp: intFromEnv("AUTH_PHONE_SENDS_PER_HOUR_PER_IP", 20, 1, 500),
    checksPerWindow: intFromEnv("AUTH_PHONE_CHECKS_PER_10_MIN", 5, 1, 20),
    checkWindowSeconds: 600,
    checksPerWindowPerIp: intFromEnv("AUTH_PHONE_CHECKS_PER_10_MIN_PER_IP", 30, 1, 500),
  };
}

export function googleConfigured(): boolean {
  return googleClientIds().length > 0;
}

export function providersStatus() {
  return {
    google: googleConfigured(),
    phone: twilioConfig() !== null,
    resendSeconds: phoneLimits().resendSeconds,
    codeLength: 6,
  };
}
