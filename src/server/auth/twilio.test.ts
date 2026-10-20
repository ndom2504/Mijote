import { describe, expect, it } from "vitest";
import { twilioConfig } from "@/server/auth/config";
import { createTwilioVerifier } from "@/server/auth/twilio";

const config = { accountSid: `AC${"a".repeat(32)}`, authToken: "t".repeat(32), serviceSid: `VA${"b".repeat(32)}` };

function fakeFetch(status: number, body: Record<string, unknown>) {
  const calls: { url: string; init: RequestInit }[] = [];
  const impl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(body), { status });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

describe("Twilio Verify", () => {
  it("envoie le code par SMS avec une authentification serveur", async () => {
    const { impl, calls } = fakeFetch(201, { status: "pending" });
    const result = await createTwilioVerifier(config, impl).start("+15145551234");
    expect(result).toEqual({ ok: true });
    expect(calls[0]?.url).toBe(`https://verify.twilio.com/v2/Services/${config.serviceSid}/Verifications`);
    const headers = calls[0]?.init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64")}`);
    expect(String(calls[0]?.init.body)).toContain("Channel=sms");
  });

  it("traduit les erreurs d'envoi sans exposer les détails du fournisseur", async () => {
    expect(await createTwilioVerifier(config, fakeFetch(429, { code: 60203 }).impl).start("+15145551234")).toEqual({ ok: false, error: "rate_limited" });
    expect(await createTwilioVerifier(config, fakeFetch(400, { code: 60205 }).impl).start("+15145551234")).toEqual({ ok: false, error: "sms_unsupported" });
    expect(await createTwilioVerifier(config, fakeFetch(400, { code: 60200 }).impl).start("+15145551234")).toEqual({ ok: false, error: "invalid_phone" });
    expect(await createTwilioVerifier(config, fakeFetch(500, {}).impl).start("+15145551234")).toEqual({ ok: false, error: "provider_error" });
  });

  it("approuve uniquement un code que Twilio marque comme approuvé", async () => {
    expect(await createTwilioVerifier(config, fakeFetch(200, { status: "approved" }).impl).check("+15145551234", "123456")).toEqual({ ok: true });
    expect(await createTwilioVerifier(config, fakeFetch(200, { status: "pending" }).impl).check("+15145551234", "123456")).toEqual({ ok: false, error: "invalid_code" });
  });

  it("distingue le code expiré, les essais épuisés et les pannes", async () => {
    expect(await createTwilioVerifier(config, fakeFetch(404, { code: 20404 }).impl).check("+15145551234", "123456")).toEqual({ ok: false, error: "expired" });
    expect(await createTwilioVerifier(config, fakeFetch(429, { code: 60202 }).impl).check("+15145551234", "123456")).toEqual({ ok: false, error: "too_many_attempts" });
    expect(await createTwilioVerifier(config, fakeFetch(503, {}).impl).check("+15145551234", "123456")).toEqual({ ok: false, error: "provider_error" });
  });

  it("traite une panne réseau comme une erreur du fournisseur", async () => {
    const broken = (async () => {
      throw new Error("réseau");
    }) as unknown as typeof fetch;
    expect(await createTwilioVerifier(config, broken).start("+15145551234")).toEqual({ ok: false, error: "provider_error" });
    expect(await createTwilioVerifier(config, broken).check("+15145551234", "123456")).toEqual({ ok: false, error: "provider_error" });
  });

  it("considère Twilio comme non configuré sans identifiants valides", () => {
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_VERIFY_SERVICE_SID;
    expect(twilioConfig()).toBeNull();
    process.env.TWILIO_ACCOUNT_SID = "ACfaux";
    process.env.TWILIO_AUTH_TOKEN = "court";
    process.env.TWILIO_VERIFY_SERVICE_SID = "VAfaux";
    expect(twilioConfig()).toBeNull();
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_VERIFY_SERVICE_SID;
  });
});
