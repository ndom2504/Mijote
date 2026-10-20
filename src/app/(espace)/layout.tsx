import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/server/auth/current";
import { LanguageSwitch, LogoutButton, TabBar } from "@/components/Shell";
import { listNotifications, syncReminders } from "@/server/notifications/service";
import { t } from "@/lib/i18n";

export default async function EspaceLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  const path = (await headers()).get("x-mijote-path") || "/";
  if (!user) redirect(`/connexion?next=${encodeURIComponent(path)}`);
  if (!user.emailVerified && path !== "/verifier") redirect("/verifier");
  if (user.emailVerified && path === "/verifier") redirect(user.onboardingCompleted ? "/aujourd-hui" : "/onboarding");
  if (user.emailVerified && !user.onboardingCompleted && path !== "/onboarding") redirect("/onboarding");
  if (user.onboardingCompleted && path === "/onboarding") redirect("/aujourd-hui");
  if (path.startsWith("/admin") && user.role !== "admin") redirect("/aujourd-hui");
  if (user.onboardingCompleted) await syncReminders(user.id, user.email);
  const unread = user.onboardingCompleted ? (await listNotifications(user.id)).filter((item) => !item.read_at).length : 0;
  const showNav = user.onboardingCompleted && path !== "/onboarding" && path !== "/verifier";
  return (
    <div className={showNav ? "shell" : ""}>
      {showNav ? <TabBar locale={user.locale} /> : null}
      <div>
        <header className="wrap topbar">
          <Link className="logo" href={user.onboardingCompleted ? "/aujourd-hui" : "/"}><span className="logo-mark" aria-hidden="true" />Mijoté</Link>
          <div className="nav-links">
            {unread > 0 ? <Link href="/profil/notifications">{unread}</Link> : null}
            <LanguageSwitch locale={user.locale} />
            <LogoutButton locale={user.locale} />
          </div>
        </header>
        <main id="contenu" className="wrap main">
          <p className="sr">{t(user.locale, "tagline")}</p>
          {children}
        </main>
      </div>
    </div>
  );
}
