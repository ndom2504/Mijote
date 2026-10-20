import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createMemoryDatabase, migrate, query, setDatabase } from "@/server/db/client";
import { startPhoneVerification, verifyPhoneLink, verifyPhoneLogin } from "@/server/auth/phoneAuth";
import { setPhoneVerifier, type PhoneVerifier } from "@/server/auth/twilio";
import { userFromSessionToken } from "@/server/auth/service";
import { loginWithPhone } from "@/server/auth/identity";

const GOOD = "123456";
const EXPIRED = "000000";

function fakeVerifier() {
  const state = { starts: 0, checks: 0 };
  const verifier: PhoneVerifier = {
    async start() {
      state.starts += 1;
      return { ok: true };
    },
    async check(_phone, code) {
      state.checks += 1;
      if (code === GOOD) return { ok: true };
      if (code === EXPIRED) return { ok: false, error: "expired" };
      return { ok: false, error: "invalid_code" };
    },
  };
  return { verifier, state };
}

let ipCounter = 0;
const nextIp = () => `10.0.0.${++ipCounter}`;

describe("connexion par SMS", () => {
  beforeAll(async () => {
    const db = await createMemoryDatabase();
    setDatabase(db);
    await migrate(db);
  }, 60000);

  beforeEach(async () => {
    await query("DELETE FROM auth_attempts");
  });

  afterEach(() => setPhoneVerifier(undefined));

  it("refuse un numéro invalide sans contacter le fournisseur", async () => {
    const { verifier, state } = fakeVerifier();
    setPhoneVerifier(verifier);
    for (const phone of ["5145551234", "+1514555", "+1 514 555 1234", "", null, 42]) {
      expect(await startPhoneVerification(phone, { ip: nextIp() })).toEqual({ ok: false, error: "invalid_phone" });
    }
    expect(state.starts).toBe(0);
  });

  it("indique honnêtement que le SMS n'est pas disponible sans configuration", async () => {
    setPhoneVerifier(null);
    expect(await startPhoneVerification("+15145551111", { ip: nextIp() })).toEqual({ ok: false, error: "phone_unavailable" });
    expect(await verifyPhoneLogin("+15145551111", GOOD, { ip: nextIp() })).toEqual({ ok: false, error: "phone_unavailable" });
  });

  it("envoie le code et annonce le délai avant un renvoi", async () => {
    const { verifier } = fakeVerifier();
    setPhoneVerifier(verifier);
    expect(await startPhoneVerification("+15145552222", { ip: nextIp() })).toEqual({ ok: true, resendAfterSeconds: 30 });
  });

  it("répond de la même façon pour un numéro connu et un nouveau numéro", async () => {
    const { verifier } = fakeVerifier();
    setPhoneVerifier(verifier);
    await loginWithPhone("+15145553333");
    const known = await startPhoneVerification("+15145553333", { ip: nextIp() });
    const unknown = await startPhoneVerification("+15145553334", { ip: nextIp() });
    expect(known).toEqual(unknown);
  });

  it("limite les renvois rapprochés puis les envois par heure", async () => {
    const { verifier, state } = fakeVerifier();
    setPhoneVerifier(verifier);
    const phone = "+15145554444";
    const start = new Date("2026-10-20T12:00:00Z");

    expect((await startPhoneVerification(phone, { ip: nextIp(), now: start })).ok).toBe(true);
    const tooSoon = await startPhoneVerification(phone, { ip: nextIp(), now: new Date(start.getTime() + 10_000) });
    expect(tooSoon.ok).toBe(false);
    expect(!tooSoon.ok && tooSoon.error).toBe("rate_limited");
    expect(!tooSoon.ok && "retryAfterSeconds" in tooSoon && tooSoon.retryAfterSeconds).toBeGreaterThan(15);
    expect(state.starts).toBe(1);

    for (let index = 1; index < 5; index += 1) {
      const result = await startPhoneVerification(phone, { ip: nextIp(), now: new Date(start.getTime() + index * 31_000) });
      expect(result.ok).toBe(true);
    }
    const sixth = await startPhoneVerification(phone, { ip: nextIp(), now: new Date(start.getTime() + 5 * 31_000) });
    expect(!sixth.ok && sixth.error).toBe("rate_limited");
    expect(state.starts).toBe(5);

    const later = await startPhoneVerification(phone, { ip: nextIp(), now: new Date(start.getTime() + 3700_000) });
    expect(later.ok).toBe(true);
  });

  it("limite les envois depuis une même adresse IP", async () => {
    const { verifier } = fakeVerifier();
    setPhoneVerifier(verifier);
    const ip = "192.168.9.9";
    let blocked = false;
    for (let index = 0; index < 25; index += 1) {
      const result = await startPhoneVerification(`+1514556${String(index).padStart(4, "0")}`, { ip });
      if (!result.ok && result.error === "rate_limited") blocked = true;
    }
    expect(blocked).toBe(true);
  });

  it("refuse un code invalide, expiré ou mal formé sans créer de compte", async () => {
    const { verifier, state } = fakeVerifier();
    setPhoneVerifier(verifier);
    const phone = "+15145555555";
    expect(await verifyPhoneLogin(phone, "654321", { ip: nextIp() })).toEqual({ ok: false, error: "invalid_code" });
    expect(await verifyPhoneLogin(phone, EXPIRED, { ip: nextIp() })).toEqual({ ok: false, error: "expired" });
    const before = state.checks;
    for (const code of ["12345", "1234567", "abcdef", "", undefined, 123456]) {
      expect(await verifyPhoneLogin(phone, code, { ip: nextIp() })).toEqual({ ok: false, error: "invalid_code" });
    }
    expect(state.checks).toBe(before);
    expect(await query("SELECT id FROM auth_identities WHERE subject = $1", [phone])).toHaveLength(0);
  });

  it("bloque après cinq essais, même avec le bon code", async () => {
    const { verifier } = fakeVerifier();
    setPhoneVerifier(verifier);
    const phone = "+15145556666";
    for (let index = 0; index < 5; index += 1) {
      expect((await verifyPhoneLogin(phone, "654321", { ip: nextIp() })).ok).toBe(false);
    }
    const blocked = await verifyPhoneLogin(phone, GOOD, { ip: nextIp() });
    expect(blocked.ok).toBe(false);
    expect(!blocked.ok && blocked.error).toBe("rate_limited");
    expect(!blocked.ok && "retryAfterSeconds" in blocked && blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("ouvre une session seulement après un code validé, pour un nouvel utilisateur puis un utilisateur existant", async () => {
    const { verifier } = fakeVerifier();
    setPhoneVerifier(verifier);
    const phone = "+15145557777";
    const first = await verifyPhoneLogin(phone, GOOD, { ip: nextIp() });
    expect(first.ok && first.login.isNewUser).toBe(true);
    const session = first.ok ? await userFromSessionToken(first.login.sessionToken) : null;
    expect(session?.id).toBe(first.ok ? first.login.userId : "");

    const second = await verifyPhoneLogin(phone, GOOD, { ip: nextIp() });
    expect(second.ok && second.login.isNewUser).toBe(false);
    expect(first.ok && second.ok && first.login.userId === second.login.userId).toBe(true);
  });

  it("lie un numéro vérifié à un compte connecté et refuse un numéro déjà utilisé ailleurs", async () => {
    const { verifier } = fakeVerifier();
    setPhoneVerifier(verifier);
    const owner = await loginWithPhone("+15145558888");
    const other = await loginWithPhone("+15145558889");
    if (!owner.ok || !other.ok) throw new Error("comptes de test");

    expect(await verifyPhoneLink(owner.userId, "+15145558890", "654321", { ip: nextIp() })).toEqual({ ok: false, error: "invalid_code" });
    expect(await verifyPhoneLink(owner.userId, "+15145558890", GOOD, { ip: nextIp() })).toEqual({ ok: true, alreadyLinked: false });
    expect(await verifyPhoneLink(other.userId, "+15145558890", GOOD, { ip: nextIp() })).toEqual({ ok: false, error: "identity_in_use" });
  });
});
