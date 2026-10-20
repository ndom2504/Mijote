import bcrypt from "bcryptjs";
import { createHash, randomBytes, randomInt } from "crypto";
import { asBoolean, one, query } from "@/server/db/client";
import { sendMail, smtpConfigured } from "@/server/notifications/mailer";

export type SessionUser = {
  id: string;
  email: string | null;
  role: "user" | "admin";
  emailVerified: boolean;
  locale: "fr" | "en";
  onboardingCompleted: boolean;
  firstName: string | null;
};

function rounds(): number {
  const value = Number(process.env.BCRYPT_ROUNDS ?? 12);
  return Number.isInteger(value) && value >= 4 && value <= 15 ? value : 12;
}

export function hashToken(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, rounds());
}

export function resetDebugEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.PASSWORD_RESET_DEBUG === "true";
}

async function issueToken(userId: string, purpose: "verify" | "reset"): Promise<string> {
  const token = purpose === "verify" ? randomInt(0, 1_000_000).toString().padStart(6, "0") : randomBytes(32).toString("base64url");
  const now = new Date();
  const expires = new Date(now.getTime() + (purpose === "verify" ? 30 : 60) * 60 * 1000).toISOString();
  await query("DELETE FROM email_tokens WHERE user_id = $1 AND purpose = $2", [userId, purpose]);
  await query(
    `INSERT INTO email_tokens (id, user_id, purpose, token_hash, expires_at, attempts, created_at) VALUES ($1,$2,$3,$4,$5,0,$6)`,
    [crypto.randomUUID(), userId, purpose, hashToken(token), expires, now.toISOString()],
  );
  return token;
}

export async function issueSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await query(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES ($1,$2,$3,$4,$5)`,
    [crypto.randomUUID(), userId, hashToken(token), expires, now.toISOString()],
  );
  return token;
}

export async function userFromSessionToken(token: string | undefined | null): Promise<SessionUser | null> {
  if (!token) return null;
  const row = await one<Record<string, unknown>>(
    `SELECT u.id, u.email, u.role, u.email_verified_at, p.locale, p.onboarding_completed, p.first_name
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     LEFT JOIN profiles p ON p.user_id = u.id
     WHERE s.token_hash = $1 AND s.expires_at > $2 AND u.deleted_at IS NULL`,
    [hashToken(token), new Date().toISOString()],
  );
  if (!row) return null;
  return {
    id: String(row.id),
    email: row.email ? String(row.email) : null,
    role: row.role === "admin" ? "admin" : "user",
    emailVerified: Boolean(row.email_verified_at),
    locale: row.locale === "en" ? "en" : "fr",
    onboardingCompleted: asBoolean(row.onboarding_completed),
    firstName: row.first_name ? String(row.first_name) : null,
  };
}

export async function destroySession(token: string | undefined | null): Promise<void> {
  if (!token) return;
  await query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
}

export async function registerAccount(email: string, password: string): Promise<
  | { ok: true; userId: string; sessionToken: string; verificationCode: string | null; mailSent: boolean }
  | { ok: false; error: "email_taken" }
> {
  const normalized = email.trim().toLowerCase();
  const existing = await one("SELECT id FROM users WHERE email = $1", [normalized]);
  if (existing) return { ok: false, error: "email_taken" };
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const passwordHash = await hashPassword(password);
  try {
    await query(
      `INSERT INTO users (id, email, password_hash, role, created_at, updated_at) VALUES ($1,$2,$3,'user',$4,$4)`,
      [id, normalized, passwordHash, now],
    );
  } catch {
    return { ok: false, error: "email_taken" };
  }
  await query(`INSERT INTO profiles (user_id, updated_at) VALUES ($1,$2)`, [id, now]);
  await query(`INSERT INTO notification_preferences (user_id, updated_at) VALUES ($1,$2)`, [id, now]);
  const code = await issueToken(id, "verify");
  const mail = await sendMail(
    normalized,
    "Mijoté — vérifiez votre courriel",
    `Votre code de vérification Mijoté est ${code}. Il expire dans 30 minutes.`,
  );
  const sessionToken = await issueSession(id);
  return { ok: true, userId: id, sessionToken, verificationCode: mail.sent ? null : code, mailSent: mail.sent };
}

export async function loginAccount(email: string, password: string): Promise<
  | { ok: true; sessionToken: string; emailVerified: boolean }
  | { ok: false; error: "invalid_login" }
> {
  const row = await one<Record<string, unknown>>(
    "SELECT id, password_hash, email_verified_at, deleted_at FROM users WHERE email = $1",
    [email.trim().toLowerCase()],
  );
  if (!row || row.deleted_at || !row.password_hash) return { ok: false, error: "invalid_login" };
  const matches = await bcrypt.compare(password, String(row.password_hash));
  if (!matches) return { ok: false, error: "invalid_login" };
  return { ok: true, sessionToken: await issueSession(String(row.id)), emailVerified: Boolean(row.email_verified_at) };
}

export async function resendVerification(userId: string, email: string): Promise<{ code: string | null; mailSent: boolean }> {
  const code = await issueToken(userId, "verify");
  const mail = await sendMail(email, "Mijoté — vérifiez votre courriel", `Votre code de vérification Mijoté est ${code}. Il expire dans 30 minutes.`);
  return { code: mail.sent ? null : code, mailSent: mail.sent };
}

export async function confirmVerification(userId: string, code: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const row = await one<Record<string, unknown>>(
    `SELECT id, token_hash, expires_at, attempts FROM email_tokens WHERE user_id = $1 AND purpose = 'verify' ORDER BY created_at DESC LIMIT 1`,
    [userId],
  );
  if (!row) return { ok: false, error: "invalid_token" };
  if (String(row.expires_at) < new Date().toISOString()) return { ok: false, error: "expired_token" };
  if (Number(row.attempts) >= 5) return { ok: false, error: "rate_limited" };
  if (String(row.token_hash) !== hashToken(code.trim())) {
    await query("UPDATE email_tokens SET attempts = attempts + 1 WHERE id = $1", [row.id]);
    return { ok: false, error: "invalid_token" };
  }
  const now = new Date().toISOString();
  await query("UPDATE users SET email_verified_at = $2, updated_at = $2 WHERE id = $1", [userId, now]);
  await query("DELETE FROM email_tokens WHERE user_id = $1 AND purpose = 'verify'", [userId]);
  return { ok: true };
}

export async function requestPasswordReset(email: string): Promise<{ mailSent: boolean; debugToken: string | null }> {
  const row = await one<Record<string, unknown>>("SELECT id, deleted_at FROM users WHERE email = $1", [email.trim().toLowerCase()]);
  if (!row || row.deleted_at) return { mailSent: false, debugToken: null };
  const token = await issueToken(String(row.id), "reset");
  const mail = await sendMail(
    email.trim().toLowerCase(),
    "Mijoté — réinitialisation du mot de passe",
    `Utilisez ce lien pour choisir un nouveau mot de passe : /reinitialiser?token=${token}`,
  );
  return { mailSent: mail.sent, debugToken: !mail.sent && resetDebugEnabled() ? token : null };
}

export async function resetPassword(token: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const row = await one<Record<string, unknown>>(
    `SELECT id, user_id, expires_at FROM email_tokens WHERE purpose = 'reset' AND token_hash = $1`,
    [hashToken(token)],
  );
  if (!row) return { ok: false, error: "invalid_token" };
  if (String(row.expires_at) < new Date().toISOString()) return { ok: false, error: "expired_token" };
  const now = new Date().toISOString();
  await query("UPDATE users SET password_hash = $2, updated_at = $3 WHERE id = $1", [row.user_id, await hashPassword(password), now]);
  await query("DELETE FROM email_tokens WHERE user_id = $1 AND purpose = 'reset'", [row.user_id]);
  await query("DELETE FROM sessions WHERE user_id = $1", [row.user_id]);
  return { ok: true };
}

export async function changePassword(userId: string, currentPassword: string, nextPassword: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const row = await one<Record<string, unknown>>("SELECT password_hash FROM users WHERE id = $1", [userId]);
  if (!row) return { ok: false, error: "not_found" };
  const matches = await bcrypt.compare(currentPassword, String(row.password_hash));
  if (!matches) return { ok: false, error: "wrong_password" };
  await query("UPDATE users SET password_hash = $2, updated_at = $3 WHERE id = $1", [userId, await hashPassword(nextPassword), new Date().toISOString()]);
  return { ok: true };
}

export async function deleteAccount(userId: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const row = await one<Record<string, unknown>>("SELECT password_hash FROM users WHERE id = $1", [userId]);
  if (!row) return { ok: false, error: "not_found" };
  const matches = await bcrypt.compare(password, String(row.password_hash));
  if (!matches) return { ok: false, error: "wrong_password" };
  await query("DELETE FROM users WHERE id = $1", [userId]);
  return { ok: true };
}

export function mailIsConfigured(): boolean {
  return smtpConfigured();
}
