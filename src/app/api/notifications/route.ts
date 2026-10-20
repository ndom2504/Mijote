import { z } from "zod";
import { fail, json, readJson, api } from "@/server/http";
import { getNotificationPrefs, listNotifications, markNotificationRead, saveNotificationPrefs } from "@/server/notifications/service";
import { smtpConfigured } from "@/server/notifications/mailer";

export const GET = api(async (_request, user) => {
  if (!user) return fail("unauthenticated", 401);
  return json({
    prefs: await getNotificationPrefs(user.id),
    items: await listNotifications(user.id),
    emailAvailable: smtpConfigured(),
  });
}, { auth: true });

export const PUT = api(async (request, user) => {
  if (!user) return fail("unauthenticated", 401);
  const parsed = z.object({
    dailyEnabled: z.boolean(),
    dailyTime: z.string(),
    weeklyEnabled: z.boolean(),
    weeklyDay: z.number().int().min(0).max(6),
    weeklyTime: z.string(),
    channel: z.enum(["in_app", "email"]),
  }).safeParse(await readJson(request));
  if (!parsed.success) return fail("invalid", 400);
  const result = await saveNotificationPrefs(user.id, parsed.data);
  if (!result.ok) return fail(result.error, 400);
  return json({ ok: true });
}, { auth: true });

export const POST = api(async (request, user) => {
  if (!user) return fail("unauthenticated", 401);
  const body = (await readJson(request)) as { id?: string } | null;
  if (!body?.id) return fail("invalid", 400);
  await markNotificationRead(user.id, body.id);
  return json({ ok: true });
}, { auth: true });
