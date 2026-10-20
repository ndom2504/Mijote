import { parseClock, quebecParts, weekStartMonday } from "@/lib/date";
import { one, query } from "@/server/db/client";
import { sendMail, smtpConfigured } from "@/server/notifications/mailer";
import { asBoolean, asNumber } from "@/server/db/client";

export type NotificationPrefs = {
  dailyEnabled: boolean;
  dailyTime: string;
  weeklyEnabled: boolean;
  weeklyDay: number;
  weeklyTime: string;
  channel: "in_app" | "email";
};

export async function getNotificationPrefs(userId: string): Promise<NotificationPrefs> {
  const row = await one<Record<string, unknown>>("SELECT * FROM notification_preferences WHERE user_id = $1", [userId]);
  return {
    dailyEnabled: asBoolean(row?.daily_enabled),
    dailyTime: String(row?.daily_time ?? "07:30"),
    weeklyEnabled: asBoolean(row?.weekly_enabled),
    weeklyDay: asNumber(row?.weekly_day, 6),
    weeklyTime: String(row?.weekly_time ?? "10:00"),
    channel: row?.channel === "email" ? "email" : "in_app",
  };
}

export async function saveNotificationPrefs(userId: string, prefs: NotificationPrefs): Promise<{ ok: true } | { ok: false; error: string }> {
  if (prefs.channel === "email" && !smtpConfigured()) return { ok: false, error: "mail_unconfigured" };
  if (!parseClock(prefs.dailyTime) || !parseClock(prefs.weeklyTime)) return { ok: false, error: "invalid" };
  await query(
    `UPDATE notification_preferences SET daily_enabled = $2, daily_time = $3, weekly_enabled = $4, weekly_day = $5, weekly_time = $6, channel = $7, updated_at = $8 WHERE user_id = $1`,
    [userId, prefs.dailyEnabled, prefs.dailyTime, prefs.weeklyEnabled, prefs.weeklyDay, prefs.weeklyTime, prefs.channel, new Date().toISOString()],
  );
  return { ok: true };
}

async function exists(userId: string, kind: string): Promise<boolean> {
  const row = await one("SELECT id FROM notifications WHERE user_id = $1 AND kind = $2", [userId, kind]);
  return Boolean(row);
}

export async function syncReminders(userId: string, email: string | null, now = new Date()): Promise<void> {
  const prefs = await getNotificationPrefs(userId);
  if (!prefs.dailyEnabled && !prefs.weeklyEnabled) return;
  const clock = quebecParts(now);
  const channel = prefs.channel === "email" && smtpConfigured() ? "email" : prefs.channel;
  if (channel === "email" && (!smtpConfigured() || !email)) return;

  const maybeSend = async (kind: string, title: string, body: string) => {
    if (await exists(userId, kind)) return;
    if (channel === "email" && email) {
      const mail = await sendMail(email, title, body);
      if (!mail.sent) return;
    }
    await query(
      `INSERT INTO notifications (id, user_id, kind, title, body, channel, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [crypto.randomUUID(), userId, kind, title, body, channel, now.toISOString()],
    );
  };

  const daily = parseClock(prefs.dailyTime);
  if (prefs.dailyEnabled && daily != null && clock.minutes >= daily) {
    await maybeSend(`daily_menu:${clock.date}`, "Mijoté — repas du jour", "Vos suggestions du jour sont prêtes dans Aujourd'hui.");
  }
  const weekly = parseClock(prefs.weeklyTime);
  if (prefs.weeklyEnabled && prefs.weeklyDay === clock.weekday && weekly != null && clock.minutes >= weekly) {
    await maybeSend(`weekly_grocery:${weekStartMonday(clock.date)}`, "Mijoté — liste d'épicerie", "C'est le moment de revoir votre liste d'épicerie.");
  }
}

export async function listNotifications(userId: string) {
  return query<{ id: string; title: string; body: string; read_at: string | null; created_at: string; channel: string }>(
    "SELECT id, title, body, read_at, created_at, channel FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20",
    [userId],
  );
}

export async function markNotificationRead(userId: string, id: string): Promise<void> {
  await query("UPDATE notifications SET read_at = $3 WHERE id = $1 AND user_id = $2", [id, userId, new Date().toISOString()]);
}
