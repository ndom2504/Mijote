"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/constants";
import { send } from "@/lib/client";
import { errorText, t } from "@/lib/i18n";

type Prefs = {
  dailyEnabled: boolean;
  dailyTime: string;
  weeklyEnabled: boolean;
  weeklyDay: number;
  weeklyTime: string;
  channel: "in_app" | "email";
};

type Item = { id: string; title: string; body: string; read_at: string | null; created_at: string };

export function NotificationForm({ locale, prefs, items, emailAvailable }: { locale: Locale; prefs: Prefs; items: Item[]; emailAvailable: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = useState(prefs);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const days = locale === "en"
    ? ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    : ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

  return (
    <div>
      <form
        className="panel"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          setSaved(false);
          try {
            await send("/api/notifications", "PUT", draft);
            setSaved(true);
            router.refresh();
          } catch (caught) {
            setError(errorText(locale, caught instanceof Error ? caught.message : "server"));
          }
        }}
      >
        {error ? <p className="notice error" role="alert">{error}</p> : null}
        {saved ? <p className="notice info" role="status">{t(locale, "saved")}</p> : null}
        <label className="chip"><input type="checkbox" checked={draft.dailyEnabled} onChange={(event) => setDraft({ ...draft, dailyEnabled: event.target.checked })} /> {t(locale, "notif_daily")}</label>
        <label htmlFor="dailyTime">{t(locale, "notif_daily")}</label>
        <input id="dailyTime" type="time" value={draft.dailyTime} onChange={(event) => setDraft({ ...draft, dailyTime: event.target.value })} />
        <label className="chip"><input type="checkbox" checked={draft.weeklyEnabled} onChange={(event) => setDraft({ ...draft, weeklyEnabled: event.target.checked })} /> {t(locale, "notif_weekly")}</label>
        <label htmlFor="weeklyDay">{t(locale, "notif_weekly")}</label>
        <select id="weeklyDay" value={draft.weeklyDay} onChange={(event) => setDraft({ ...draft, weeklyDay: Number(event.target.value) })}>
          {days.map((day, index) => <option key={day} value={index}>{day}</option>)}
        </select>
        <label htmlFor="weeklyTime">{t(locale, "notif_weekly")}</label>
        <input id="weeklyTime" type="time" value={draft.weeklyTime} onChange={(event) => setDraft({ ...draft, weeklyTime: event.target.value })} />
        <label htmlFor="channel">{t(locale, "channel")}</label>
        <select id="channel" value={draft.channel} onChange={(event) => setDraft({ ...draft, channel: event.target.value as Prefs["channel"] })}>
          <option value="in_app">{t(locale, "channel_app")}</option>
          <option value="email" disabled={!emailAvailable}>{t(locale, "channel_email")}</option>
        </select>
        {!emailAvailable ? <p className="meta">{t(locale, "email_unavailable")}</p> : null}
        <button className="btn btn-primary" type="submit">{t(locale, "save")}</button>
      </form>
      <h2>{t(locale, "notifications")}</h2>
      {items.length === 0 ? <p className="notice info">{t(locale, "no_notifications")}</p> : null}
      {items.map((item) => (
        <article className="panel" key={item.id}>
          <h3>{item.title}</h3>
          <p>{item.body}</p>
          {!item.read_at ? (
            <button className="btn btn-secondary" type="button" onClick={async () => { await send("/api/notifications", "POST", { id: item.id }); router.refresh(); }}>
              {t(locale, "mark_read")}
            </button>
          ) : null}
        </article>
      ))}
    </div>
  );
}
