import Link from "next/link";
import { currentUser } from "@/server/auth/current";
import { t } from "@/lib/i18n";
import { redirect } from "next/navigation";

export default async function Page() {
  const user = await currentUser();
  if (!user) redirect("/connexion");
  const links = [
    ["/profil/preferences", "preferences"],
    ["/profil/notifications", "notifications"],
    ["/profil/confidentialite", "privacy"],
    ["/recettes", "catalog"],
  ] as const;
  return (
    <>
      <h1>{t(user.locale, "nav_profile")}</h1>
      <p>{user.email}</p>
      <div className="cards">
        {links.map(([href, key]) => (
          <Link className="panel" key={href} href={href}><h2>{t(user.locale, key)}</h2></Link>
        ))}
        {user.role === "admin" ? <Link className="panel" href="/admin"><h2>{t(user.locale, "admin")}</h2></Link> : null}
      </div>
    </>
  );
}
