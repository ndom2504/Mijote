import { currentUser } from "@/server/auth/current";
import { getNotificationPrefs, listNotifications } from "@/server/notifications/service";
import { smtpConfigured } from "@/server/notifications/mailer";
import { NotificationForm } from "@/components/NotificationForm";
import { t } from "@/lib/i18n";
import { redirect } from "next/navigation";

export default async function Page() {
  const user = await currentUser();
  if (!user) redirect("/connexion");
  const prefs = await getNotificationPrefs(user.id);
  const items = await listNotifications(user.id);
  return (
    <>
      <h1>{t(user.locale, "notifications")}</h1>
      <p className="meta">{t(user.locale, "notif_help")}</p>
      <NotificationForm locale={user.locale} prefs={prefs} items={items} emailAvailable={smtpConfigured()} />
    </>
  );
}
