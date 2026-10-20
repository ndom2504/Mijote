import { generateKeyPairSync, createSign } from "crypto";
import { describe, expect, it } from "vitest";
import { verifyGoogleIdToken, type GoogleDeps } from "@/server/auth/google";

const CLIENT_ID = "1234567890-abcdef.apps.googleusercontent.com";
const NOW = 1_800_000_000_000;

const pair = generateKeyPairSync("rsa", { modulusLength: 2048 });
const other = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = { ...pair.publicKey.export({ format: "jwk" }), kid: "key-1", alg: "RS256", use: "sig" };

function b64(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function token(claims: Record<string, unknown> = {}, options: { key?: typeof pair.privateKey; kid?: string; alg?: string } = {}): string {
  const header = b64({ alg: options.alg ?? "RS256", kid: options.kid ?? "key-1", typ: "JWT" });
  const payload = b64({
    iss: "https://accounts.google.com",
    aud: CLIENT_ID,
    sub: "google-user-1",
    email: "Alice@Example.com",
    email_verified: true,
    given_name: "Alice",
    iat: NOW / 1000 - 60,
    exp: NOW / 1000 + 3000,
    ...claims,
  });
  const signature = createSign("RSA-SHA256").update(`${header}.${payload}`).sign(options.key ?? pair.privateKey).toString("base64url");
  return `${header}.${payload}.${signature}`;
}

const deps: GoogleDeps = { now: () => NOW, clientIds: [CLIENT_ID], getKeys: async () => [jwk] };

describe("vérification du jeton Google", () => {
  it("accepte un jeton valide et normalise le courriel", async () => {
    const result = await verifyGoogleIdToken(token(), deps);
    expect(result).toEqual({
      ok: true,
      profile: { sub: "google-user-1", email: "alice@example.com", emailVerified: true, givenName: "Alice" },
    });
  });

  it("ignore un courriel non vérifié", async () => {
    const result = await verifyGoogleIdToken(token({ email_verified: false }), deps);
    expect(result.ok && result.profile.email).toBe(null);
    expect(result.ok && result.profile.emailVerified).toBe(false);
  });

  it("refuse une signature produite avec une autre clé", async () => {
    const result = await verifyGoogleIdToken(token({}, { key: other.privateKey }), deps);
    expect(result).toEqual({ ok: false, error: "invalid_token" });
  });

  it("refuse une audience qui n'est pas configurée", async () => {
    const result = await verifyGoogleIdToken(token({ aud: "autre-app.apps.googleusercontent.com" }), deps);
    expect(result).toEqual({ ok: false, error: "audience" });
  });

  it("refuse un jeton expiré mais tolère un léger décalage d'horloge", async () => {
    expect(await verifyGoogleIdToken(token({ exp: NOW / 1000 - 600 }), deps)).toEqual({ ok: false, error: "expired" });
    expect((await verifyGoogleIdToken(token({ exp: NOW / 1000 - 30 }), deps)).ok).toBe(true);
  });

  it("refuse un émetteur inconnu, un algorithme non prévu et un jeton mal formé", async () => {
    expect(await verifyGoogleIdToken(token({ iss: "https://evil.example" }), deps)).toEqual({ ok: false, error: "invalid_token" });
    expect(await verifyGoogleIdToken(token({}, { alg: "none" }), deps)).toEqual({ ok: false, error: "invalid_token" });
    expect(await verifyGoogleIdToken("pas.un.jeton!", deps)).toEqual({ ok: false, error: "invalid_token" });
    expect(await verifyGoogleIdToken("abc", deps)).toEqual({ ok: false, error: "invalid_token" });
  });

  it("refuse une clé inconnue après avoir actualisé la liste", async () => {
    let calls = 0;
    const result = await verifyGoogleIdToken(token({}, { kid: "inconnue" }), {
      ...deps,
      getKeys: async () => {
        calls += 1;
        return [jwk];
      },
    });
    expect(result).toEqual({ ok: false, error: "invalid_token" });
    expect(calls).toBe(2);
  });

  it("signale l'absence de configuration plutôt que de simuler un succès", async () => {
    expect(await verifyGoogleIdToken(token(), { ...deps, clientIds: [] })).toEqual({ ok: false, error: "unavailable" });
  });

  it("signale une erreur réseau lors de la récupération des clés de Google", async () => {
    const result = await verifyGoogleIdToken(token(), {
      ...deps,
      getKeys: async () => {
        throw new Error("réseau");
      },
    });
    expect(result).toEqual({ ok: false, error: "provider_error" });
  });
});
