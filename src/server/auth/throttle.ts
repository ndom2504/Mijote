import { createHash } from "crypto";
import { query } from "@/server/db/client";

export type Throttle = { ok: true } | { ok: false; retryAfterSeconds: number };

/** Empreinte stable d'une donnée personnelle : les clés de limitation ne contiennent jamais le numéro en clair. */
export function throttleKey(scope: string, value: string): string {
  return `${scope}:${createHash("sha256").update(value).digest("hex").slice(0, 32)}`;
}

/**
 * Compte une tentative dans une fenêtre glissante, enregistrée en base pour survivre aux redémarrages
 * et aux instances multiples. Retourne `ok: false` avec le délai d'attente lorsque la limite est atteinte.
 */
export async function consumeAttempt(key: string, max: number, windowSeconds: number, now: Date = new Date()): Promise<Throttle> {
  const since = new Date(now.getTime() - windowSeconds * 1000).toISOString();
  await query("DELETE FROM auth_attempts WHERE key = $1 AND at < $2", [key, since]);
  const rows = await query<{ at: string }>("SELECT at FROM auth_attempts WHERE key = $1 ORDER BY at ASC", [key]);
  if (rows.length >= max) {
    const oldest = new Date(String(rows[0]?.at)).getTime();
    const wait = Math.ceil((oldest + windowSeconds * 1000 - now.getTime()) / 1000);
    return { ok: false, retryAfterSeconds: Math.max(1, wait) };
  }
  await query("INSERT INTO auth_attempts (key, at) VALUES ($1, $2)", [key, now.toISOString()]);
  return { ok: true };
}

export async function clearAttempts(key: string): Promise<void> {
  await query("DELETE FROM auth_attempts WHERE key = $1", [key]);
}

/** Nettoyage opportuniste des tentatives de plus d'un jour. */
export async function pruneAttempts(now: Date = new Date()): Promise<void> {
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  await query("DELETE FROM auth_attempts WHERE at < $1", [cutoff]);
}
