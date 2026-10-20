import { one, query } from "@/server/db/client";
import type { GoogleProfile } from "@/server/auth/google";
import { issueSession } from "@/server/auth/service";

export type Provider = "google" | "phone";

export type IdentityLogin =
  | { ok: true; userId: string; sessionToken: string; isNewUser: boolean }
  | { ok: false; error: "email_in_use" | "account_unavailable" };

async function userForIdentity(provider: Provider, subject: string) {
  return one<{ user_id: string; deleted_at: string | null }>(
    `SELECT i.user_id, u.deleted_at FROM auth_identities i JOIN users u ON u.id = i.user_id WHERE i.provider = $1 AND i.subject = $2`,
    [provider, subject],
  );
}

async function createUser(input: { email: string | null; verifiedEmail: boolean; firstName: string | null }): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await query(
    `INSERT INTO users (id, email, password_hash, role, email_verified_at, created_at, updated_at) VALUES ($1,$2,NULL,'user',$3,$4,$4)`,
    [id, input.email, input.verifiedEmail ? now : null, now],
  );
  await query(`INSERT INTO profiles (user_id, first_name, updated_at) VALUES ($1,$2,$3)`, [id, input.firstName, now]);
  await query(`INSERT INTO notification_preferences (user_id, updated_at) VALUES ($1,$2)`, [id, now]);
  return id;
}

async function addIdentity(userId: string, provider: Provider, subject: string, email: string | null): Promise<void> {
  const now = new Date().toISOString();
  await query(
    `INSERT INTO auth_identities (id, user_id, provider, subject, email, created_at, last_login_at) VALUES ($1,$2,$3,$4,$5,$6,$6)`,
    [crypto.randomUUID(), userId, provider, subject, email, now],
  );
}

async function touch(provider: Provider, subject: string): Promise<void> {
  await query(`UPDATE auth_identities SET last_login_at = $3 WHERE provider = $1 AND subject = $2`, [provider, subject, new Date().toISOString()]);
}

/** Retrouve le compte lié à cette identité, ou en crée un nouveau. Une identité inconnue n'est jamais rattachée à un compte existant. */
async function loginOrCreate(
  provider: Provider,
  subject: string,
  create: { email: string | null; verifiedEmail: boolean; firstName: string | null; identityEmail: string | null },
): Promise<IdentityLogin> {
  const existing = await userForIdentity(provider, subject);
  if (existing) {
    if (existing.deleted_at) return { ok: false, error: "account_unavailable" };
    await touch(provider, subject);
    return { ok: true, userId: existing.user_id, sessionToken: await issueSession(existing.user_id), isNewUser: false };
  }

  if (create.email) {
    const taken = await one("SELECT id FROM users WHERE lower(email) = $1", [create.email]);
    if (taken) return { ok: false, error: "email_in_use" };
  }

  const userId = await createUser({ email: create.email, verifiedEmail: create.verifiedEmail, firstName: create.firstName });
  try {
    await addIdentity(userId, provider, subject, create.identityEmail);
  } catch {
    // Deux demandes simultanées pour la même identité : on garde le compte du gagnant.
    await query("DELETE FROM users WHERE id = $1", [userId]);
    const winner = await userForIdentity(provider, subject);
    if (!winner || winner.deleted_at) return { ok: false, error: "account_unavailable" };
    return { ok: true, userId: winner.user_id, sessionToken: await issueSession(winner.user_id), isNewUser: false };
  }
  return { ok: true, userId, sessionToken: await issueSession(userId), isNewUser: true };
}

export function loginWithGoogle(profile: GoogleProfile): Promise<IdentityLogin> {
  return loginOrCreate("google", profile.sub, {
    email: profile.emailVerified ? profile.email : null,
    verifiedEmail: profile.emailVerified,
    firstName: profile.givenName,
    identityEmail: profile.emailVerified ? profile.email : null,
  });
}

export function loginWithPhone(e164: string): Promise<IdentityLogin> {
  return loginOrCreate("phone", e164, { email: null, verifiedEmail: false, firstName: null, identityEmail: null });
}

/**
 * Lie une méthode de connexion à un compte déjà connecté, après vérification de cette méthode.
 * Le consentement est l'action explicite d'un utilisateur authentifié ; rien n'est lié automatiquement.
 */
export async function linkIdentity(
  userId: string,
  provider: Provider,
  subject: string,
  email: string | null,
): Promise<{ ok: true; alreadyLinked: boolean } | { ok: false; error: "identity_in_use" }> {
  const existing = await userForIdentity(provider, subject);
  if (existing) {
    return existing.user_id === userId ? { ok: true, alreadyLinked: true } : { ok: false, error: "identity_in_use" };
  }
  try {
    await addIdentity(userId, provider, subject, email);
  } catch {
    return { ok: false, error: "identity_in_use" };
  }
  return { ok: true, alreadyLinked: false };
}

export async function identitiesOf(userId: string): Promise<{ provider: Provider; email: string | null }[]> {
  const rows = await query<{ provider: string; email: string | null }>(
    "SELECT provider, email FROM auth_identities WHERE user_id = $1 ORDER BY created_at ASC",
    [userId],
  );
  return rows.map((row) => ({ provider: row.provider === "google" ? "google" : "phone", email: row.email }));
}
