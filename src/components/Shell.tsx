"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/constants";
import { send } from "@/lib/client";
import { t } from "@/lib/i18n";

const tabs = [
  ["/", "nav_today"],
  ["/menus", "nav_menus"],
  ["/epicerie", "nav_grocery"],
  ["/favoris", "nav_favorites"],
  ["/profil", "nav_profile"],
] as const;

export function TabBar({ locale }: { locale: Locale }) {
  const path = usePathname();
  return (
    <nav className="tabbar" aria-label="Navigation">
      {tabs.map(([href, key]) => {
        const current = href === "/" ? path.startsWith("/aujourd") : path.startsWith(href);
        return (
          <Link key={href} className="tab" href={href === "/" ? "/aujourd-hui" : href} aria-current={current ? "page" : undefined}>
            {t(locale, key)}
          </Link>
        );
      })}
    </nav>
  );
}

export function LogoutButton({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      className="btn btn-secondary"
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await send("/api/auth/logout", "POST", {});
        router.push("/connexion");
        router.refresh();
      }}
    >
      {t(locale, "logout")}
    </button>
  );
}

export function LanguageSwitch({ locale }: { locale: Locale }) {
  const router = useRouter();
  return (
    <button
      className="btn btn-secondary"
      type="button"
      onClick={async () => {
        await send("/api/locale", "POST", { locale: locale === "fr" ? "en" : "fr" });
        router.refresh();
      }}
    >
      {locale === "fr" ? "English" : "Français"}
    </button>
  );
}

export function Photo({ src }: { src: string | null }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <div className="photo-fallback" aria-hidden="true" />;
  return <img className="photo" src={src} alt="" onError={() => setFailed(true)} />;
}
