import { createPublicKey, createVerify } from "crypto";
import { googleClientIds } from "@/server/auth/config";

export interface GoogleProfile {
  /** Identifiant stable et unique chez Google (`sub`). */
  sub: string;
  email: string | null;
  emailVerified: boolean;
  givenName: string | null;
}

export type GoogleVerification =
  | { ok: true; profile: GoogleProfile }
  | { ok: false; error: "unavailable" | "invalid_token" | "expired" | "audience" | "provider_error" };

type Jwk = { kid?: string; kty?: string; n?: string; e?: string; alg?: string; use?: string };

export interface GoogleDeps {
  now?: () => number;
  clientIds?: string[];
  /** Retourne les clés publiques de Google. `forceRefresh` ignore le cache. */
  getKeys?: (forceRefresh: boolean) => Promise<Jwk[]>;
}

const JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const ISSUERS = new Set(["accounts.google.com", "https://accounts.google.com"]);
const CLOCK_SKEW_SECONDS = 60;

let cache: { keys: Jwk[]; expires: number } | null = null;

async function fetchGoogleKeys(forceRefresh: boolean): Promise<Jwk[]> {
  if (!forceRefresh && cache && cache.expires > Date.now()) return cache.keys;
  const response = await fetch(JWKS_URL, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error("jwks");
  const data = (await response.json()) as { keys?: Jwk[] };
  const keys = Array.isArray(data.keys) ? data.keys : [];
  const maxAge = /max-age=(\d+)/.exec(response.headers.get("cache-control") ?? "")?.[1];
  cache = { keys, expires: Date.now() + (maxAge ? Number(maxAge) : 3600) * 1000 };
  return keys;
}

function decodePart<T>(part: string): T | null {
  try {
    return JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

function signatureValid(signingInput: string, signature: string, jwk: Jwk): boolean {
  try {
    const key = createPublicKey({ key: jwk as never, format: "jwk" });
    return createVerify("RSA-SHA256").update(signingInput).verify(key, Buffer.from(signature, "base64url"));
  } catch {
    return false;
  }
}

/**
 * Vérifie un jeton d'identité Google côté serveur : signature RS256 avec les clés publiques de Google,
 * émetteur, audience (identifiants configurés), expiration et courriel vérifié.
 * Ne reçoit et ne conserve jamais le mot de passe Google.
 */
export async function verifyGoogleIdToken(idToken: string, deps: GoogleDeps = {}): Promise<GoogleVerification> {
  const clientIds = deps.clientIds ?? googleClientIds();
  if (clientIds.length === 0) return { ok: false, error: "unavailable" };
  if (typeof idToken !== "string" || idToken.length > 4096) return { ok: false, error: "invalid_token" };
  const parts = idToken.split(".");
  if (parts.length !== 3 || parts.some((part) => !/^[\w-]+$/.test(part))) return { ok: false, error: "invalid_token" };

  const header = decodePart<{ alg?: string; kid?: string }>(parts[0]!);
  const payload = decodePart<Record<string, unknown>>(parts[1]!);
  if (!header || !payload || header.alg !== "RS256" || !header.kid) return { ok: false, error: "invalid_token" };

  const getKeys = deps.getKeys ?? fetchGoogleKeys;
  const signingInput = `${parts[0]}.${parts[1]}`;
  let valid = false;
  try {
    let keys = await getKeys(false);
    let jwk = keys.find((item) => item.kid === header.kid);
    if (!jwk) {
      keys = await getKeys(true);
      jwk = keys.find((item) => item.kid === header.kid);
    }
    valid = jwk ? signatureValid(signingInput, parts[2]!, jwk) : false;
  } catch {
    return { ok: false, error: "provider_error" };
  }
  if (!valid) return { ok: false, error: "invalid_token" };

  const nowSeconds = Math.floor((deps.now ?? Date.now)() / 1000);
  if (typeof payload.iss !== "string" || !ISSUERS.has(payload.iss)) return { ok: false, error: "invalid_token" };
  if (typeof payload.aud !== "string" || !clientIds.includes(payload.aud)) return { ok: false, error: "audience" };
  if (typeof payload.exp !== "number" || payload.exp + CLOCK_SKEW_SECONDS < nowSeconds) return { ok: false, error: "expired" };
  if (typeof payload.iat === "number" && payload.iat - CLOCK_SKEW_SECONDS > nowSeconds) return { ok: false, error: "invalid_token" };
  if (typeof payload.sub !== "string" || payload.sub.length === 0 || payload.sub.length > 255) return { ok: false, error: "invalid_token" };

  const email = typeof payload.email === "string" && payload.email.length <= 254 ? payload.email.trim().toLowerCase() : null;
  const emailVerified = payload.email_verified === true || payload.email_verified === "true";
  return {
    ok: true,
    profile: {
      sub: payload.sub,
      email: email && emailVerified ? email : null,
      emailVerified: Boolean(email && emailVerified),
      givenName: typeof payload.given_name === "string" ? payload.given_name.trim().slice(0, 80) || null : null,
    },
  };
}
