import { z } from "zod";
import {
  changePassword,
  confirmVerification,
  deleteAccount,
  loginAccount,
  registerAccount,
  requestPasswordReset,
  resendVerification,
  resetPassword,
} from "@/server/auth/service";
import { providersStatus } from "@/server/auth/config";
import { verifyGoogleIdToken } from "@/server/auth/google";
import { linkIdentity, loginWithGoogle } from "@/server/auth/identity";
import { startPhoneVerification, verifyPhoneLink, verifyPhoneLogin } from "@/server/auth/phoneAuth";
import { consumeAttempt, throttleKey } from "@/server/auth/throttle";
import { bearerToken, clearSessionCookie, clientKey, fail, json, mobileClient, rateLimit, readJson, withSessionCookie, api } from "@/server/http";

const email = z.string().trim().email().max(254);
const password = z.string().min(10).max(128);

function waitFail(error: string, status: number, retryAfterSeconds: number) {
  const response = json({ error, retryAfterSeconds }, status);
  response.headers.set("Retry-After", String(retryAfterSeconds));
  return response;
}

const PHONE_START_STATUS = { invalid_phone: 400, phone_unavailable: 503, sms_unsupported: 422, provider_error: 502 } as const;
const PHONE_CHECK_STATUS = {
  invalid_phone: 400,
  invalid_code: 400,
  expired: 400,
  phone_unavailable: 503,
  provider_error: 502,
  account_unavailable: 403,
  identity_in_use: 409,
} as const;

export const GET = api(async (_request, user, context) => {
  const { action } = await context.params;
  if (action === "providers") return json(providersStatus());
  if (action !== "me") return fail("not_found", 404);
  return json({ user });
});

export const POST = api(async (request, user, context) => {
  const { action } = await context.params;
  const body = (await readJson(request)) as Record<string, unknown> | null;
  const ip = clientKey(request);

  if (action === "register") {
    if (!rateLimit(`register:${ip}`, 5, 60 * 60 * 1000)) return fail("rate_limited", 429);
    const parsed = z.object({ email, password, confirm: password }).safeParse(body);
    if (!parsed.success) return fail("password_short", 400);
    if (parsed.data.password !== parsed.data.confirm) return fail("password_mismatch", 400);
    const result = await registerAccount(parsed.data.email, parsed.data.password);
    if (!result.ok) return fail(result.error, 409);
    const payload: Record<string, unknown> = { verificationCode: result.verificationCode, mailSent: result.mailSent };
    if (mobileClient(request)) payload.token = result.sessionToken;
    return withSessionCookie(json(payload), result.sessionToken);
  }

  if (action === "login") {
    if (!rateLimit(`login:${ip}`, 10, 15 * 60 * 1000)) return fail("rate_limited", 429);
    const parsed = z.object({ email, password: z.string().min(1).max(128) }).safeParse(body);
    if (!parsed.success) return fail("invalid_login", 401);
    const result = await loginAccount(parsed.data.email, parsed.data.password);
    if (!result.ok) return fail(result.error, 401);
    const payload: Record<string, unknown> = { emailVerified: result.emailVerified };
    if (mobileClient(request)) payload.token = result.sessionToken;
    return withSessionCookie(json(payload), result.sessionToken);
  }

  if (action === "google" || action === "link-google") {
    if (!mobileClient(request)) return fail("mobile_only", 403);
    if (action === "link-google" && !user) return fail("unauthenticated", 401);
    const gate = await consumeAttempt(throttleKey("google-ip", ip), 20, 600);
    if (!gate.ok) return waitFail("rate_limited", 429, gate.retryAfterSeconds);
    const parsed = z.object({ idToken: z.string().min(20).max(4096) }).safeParse(body);
    if (!parsed.success) return fail("invalid_input", 400);
    const verified = await verifyGoogleIdToken(parsed.data.idToken);
    if (!verified.ok) {
      if (verified.error === "unavailable") return fail("google_unavailable", 503);
      if (verified.error === "provider_error") return fail("network", 502);
      return fail("google_failed", 401);
    }
    if (action === "link-google" && user) {
      const linked = await linkIdentity(user.id, "google", verified.profile.sub, verified.profile.email);
      return linked.ok ? json({ ok: true, alreadyLinked: linked.alreadyLinked }) : fail(linked.error, 409);
    }
    const login = await loginWithGoogle(verified.profile);
    if (!login.ok) return fail(login.error, login.error === "email_in_use" ? 409 : 403);
    return json({ token: login.sessionToken, isNewUser: login.isNewUser });
  }

  if (action === "phone-start") {
    if (!mobileClient(request)) return fail("mobile_only", 403);
    const result = await startPhoneVerification(body?.phone, { ip });
    if (result.ok) return json({ ok: true, resendAfterSeconds: result.resendAfterSeconds });
    if (result.error === "rate_limited") return waitFail("rate_limited", 429, result.retryAfterSeconds);
    return fail(result.error, PHONE_START_STATUS[result.error]);
  }

  if (action === "phone-verify") {
    if (!mobileClient(request)) return fail("mobile_only", 403);
    const result = await verifyPhoneLogin(body?.phone, body?.code, { ip });
    if (result.ok) return json({ token: result.login.sessionToken, isNewUser: result.login.isNewUser });
    if (result.error === "rate_limited") return waitFail("rate_limited", 429, result.retryAfterSeconds);
    return fail(result.error, PHONE_CHECK_STATUS[result.error]);
  }

  if (action === "link-phone") {
    if (!mobileClient(request)) return fail("mobile_only", 403);
    if (!user) return fail("unauthenticated", 401);
    const result = await verifyPhoneLink(user.id, body?.phone, body?.code, { ip });
    if (result.ok) return json({ ok: true, alreadyLinked: result.alreadyLinked });
    if (result.error === "rate_limited") return waitFail("rate_limited", 429, result.retryAfterSeconds);
    return fail(result.error, PHONE_CHECK_STATUS[result.error]);
  }

  if (action === "logout") {
    const { cookies } = await import("next/headers");
    const token = bearerToken(request) ?? (await cookies()).get("mijote_session")?.value;
    const { destroySession } = await import("@/server/auth/service");
    await destroySession(token);
    return clearSessionCookie(json({ ok: true }));
  }

  if (action === "verify") {
    if (!user) return fail("unauthenticated", 401);
    if (body?.resend === true) {
      if (!user.email) return fail("not_applicable", 400);
      const sent = await resendVerification(user.id, user.email);
      return json(sent);
    }
    const code = z.string().trim().length(6).safeParse(body?.code);
    if (!code.success) return fail("invalid_token", 400);
    const result = await confirmVerification(user.id, code.data);
    if (!result.ok) return fail(result.error, 400);
    return json({ ok: true });
  }

  if (action === "forgot") {
    if (!rateLimit(`forgot:${ip}`, 5, 60 * 60 * 1000)) return fail("rate_limited", 429);
    const parsed = z.object({ email }).safeParse(body);
    if (!parsed.success) return json({ ok: true, mailSent: false, debugToken: null });
    const result = await requestPasswordReset(parsed.data.email);
    return json({ ok: true, ...result });
  }

  if (action === "reset") {
    const parsed = z.object({ token: z.string().min(10), password, confirm: password }).safeParse(body);
    if (!parsed.success || parsed.data.password !== parsed.data.confirm) return fail("password_short", 400);
    const result = await resetPassword(parsed.data.token, parsed.data.password);
    if (!result.ok) return fail(result.error, 400);
    return json({ ok: true });
  }

  if (action === "password") {
    if (!user) return fail("unauthenticated", 401);
    const parsed = z.object({ current: z.string().min(1), password, confirm: password }).safeParse(body);
    if (!parsed.success || parsed.data.password !== parsed.data.confirm) return fail("password_short", 400);
    const result = await changePassword(user.id, parsed.data.current, parsed.data.password);
    if (!result.ok) return fail(result.error, 400);
    return json({ ok: true });
  }

  return fail("not_found", 404);
});

export const DELETE = api(async (request, user) => {
  if (!user) return fail("unauthenticated", 401);
  const body = (await readJson(request)) as { password?: string } | null;
  const result = await deleteAccount(user.id, body?.password ?? "");
  if (!result.ok) return fail(result.error, 400);
  return clearSessionCookie(json({ ok: true }));
}, { auth: true });
