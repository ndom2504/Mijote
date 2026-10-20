import { beforeAll, describe, expect, it } from "vitest";
import { createMemoryDatabase, migrate, one, query, setDatabase } from "@/server/db/client";
import { identitiesOf, linkIdentity, loginWithGoogle, loginWithPhone } from "@/server/auth/identity";
import { destroySession, loginAccount, registerAccount, userFromSessionToken } from "@/server/auth/service";

const google = (sub: string, email: string | null = `${sub}@example.com`) => ({
  sub,
  email,
  emailVerified: email !== null,
  givenName: "Alice",
});

describe("comptes Google et téléphone", () => {
  beforeAll(async () => {
    const db = await createMemoryDatabase();
    setDatabase(db);
    await migrate(db);
  }, 60000);

  it("crée un compte Google pour un nouvel utilisateur, puis le retrouve", async () => {
    const first = await loginWithGoogle(google("g-new"));
    expect(first.ok && first.isNewUser).toBe(true);
    const again = await loginWithGoogle(google("g-new"));
    expect(again.ok && again.isNewUser).toBe(false);
    expect(first.ok && again.ok && first.userId === again.userId).toBe(true);

    const session = first.ok ? await userFromSessionToken(first.sessionToken) : null;
    expect(session?.email).toBe("g-new@example.com");
    expect(session?.emailVerified).toBe(true);
    expect(session?.firstName).toBe("Alice");
    const row = await one<{ password_hash: string | null }>("SELECT password_hash FROM users WHERE email = 'g-new@example.com'");
    expect(row?.password_hash).toBeNull();
  });

  it("crée un compte téléphone sans courriel et le retrouve au prochain code", async () => {
    const first = await loginWithPhone("+15145550101");
    const again = await loginWithPhone("+15145550101");
    expect(first.ok && first.isNewUser).toBe(true);
    expect(again.ok && again.isNewUser).toBe(false);
    expect(first.ok && again.ok && first.userId === again.userId).toBe(true);
    const session = first.ok ? await userFromSessionToken(first.sessionToken) : null;
    expect(session?.email).toBeNull();
    expect(session?.emailVerified).toBe(false);
  });

  it("n'associe jamais un compte Google à un compte courriel existant", async () => {
    const created = await registerAccount("existant@example.com", "motdepasse-solide");
    expect(created.ok).toBe(true);
    const before = (await query("SELECT id FROM users")).length;
    const result = await loginWithGoogle(google("g-collision", "existant@example.com"));
    expect(result).toEqual({ ok: false, error: "email_in_use" });
    expect((await query("SELECT id FROM users")).length).toBe(before);
    const identity = await one("SELECT id FROM auth_identities WHERE subject = 'g-collision'");
    expect(identity).toBeNull();
  });

  it("garde séparés le compte Google et le compte téléphone d'une même personne", async () => {
    const byGoogle = await loginWithGoogle(google("g-separe"));
    const byPhone = await loginWithPhone("+15145550102");
    expect(byGoogle.ok && byPhone.ok && byGoogle.userId !== byPhone.userId).toBe(true);
  });

  it("crée un compte Google sans courriel lorsque Google ne l'a pas vérifié", async () => {
    const result = await loginWithGoogle(google("g-sans-courriel", null));
    const session = result.ok ? await userFromSessionToken(result.sessionToken) : null;
    expect(session?.email).toBeNull();
    expect(session?.emailVerified).toBe(false);
  });

  it("refuse la connexion par mot de passe sur un compte sans mot de passe, sans révéler pourquoi", async () => {
    const missing = await loginAccount("inconnu@example.com", "motdepasse-solide");
    const passwordless = await loginAccount("g-new@example.com", "motdepasse-solide");
    expect(missing).toEqual({ ok: false, error: "invalid_login" });
    expect(passwordless).toEqual(missing);
  });

  it("lie une identité uniquement à la demande d'un utilisateur connecté", async () => {
    const owner = await loginWithPhone("+15145550103");
    const stranger = await loginWithPhone("+15145550104");
    if (!owner.ok || !stranger.ok) throw new Error("comptes de test");

    const linked = await linkIdentity(owner.userId, "google", "g-lie", "lie@example.com");
    expect(linked).toEqual({ ok: true, alreadyLinked: false });
    expect(await linkIdentity(owner.userId, "google", "g-lie", "lie@example.com")).toEqual({ ok: true, alreadyLinked: true });
    expect(await linkIdentity(stranger.userId, "google", "g-lie", null)).toEqual({ ok: false, error: "identity_in_use" });
    expect((await identitiesOf(owner.userId)).map((item) => item.provider).sort()).toEqual(["google", "phone"]);

    const viaGoogle = await loginWithGoogle(google("g-lie", "lie@example.com"));
    expect(viaGoogle.ok && viaGoogle.userId).toBe(owner.userId);
  });

  it("refuse la connexion d'un compte supprimé", async () => {
    const created = await loginWithPhone("+15145550105");
    if (!created.ok) throw new Error("compte de test");
    await query("UPDATE users SET deleted_at = $2 WHERE id = $1", [created.userId, new Date().toISOString()]);
    expect(await loginWithPhone("+15145550105")).toEqual({ ok: false, error: "account_unavailable" });
  });

  it("gère l'expiration et la fermeture des sessions", async () => {
    const created = await loginWithPhone("+15145550106");
    if (!created.ok) throw new Error("compte de test");
    expect((await userFromSessionToken(created.sessionToken))?.id).toBe(created.userId);

    await destroySession(created.sessionToken);
    expect(await userFromSessionToken(created.sessionToken)).toBeNull();

    const next = await loginWithPhone("+15145550106");
    if (!next.ok) throw new Error("connexion");
    expect(next.sessionToken).not.toBe(created.sessionToken);
    await query("UPDATE sessions SET expires_at = $1 WHERE user_id = $2", [new Date(Date.now() - 1000).toISOString(), created.userId]);
    expect(await userFromSessionToken(next.sessionToken)).toBeNull();
    expect(await userFromSessionToken(null)).toBeNull();
    expect(await userFromSessionToken("jeton-invente")).toBeNull();
  });
});
