import Link from "next/link";
import { LanguageSwitch } from "@/components/Shell";
import { getLocale } from "@/server/i18n/locale";
import { t } from "@/lib/i18n";

export default async function HomePage() {
  const locale = await getLocale();
  return (
    <>
      <header className="wrap topbar">
        <Link className="logo" href="/"><span className="logo-mark" aria-hidden="true" />Mijoté</Link>
        <div className="nav-links">
          <LanguageSwitch locale={locale} />
          <Link className="btn btn-secondary" href="/connexion">{t(locale, "login")}</Link>
          <Link className="btn btn-primary" href="/inscription">{t(locale, "signup")}</Link>
        </div>
      </header>
      <main id="contenu" className="wrap main">
        <section className="hero">
          <div>
            <p className="kicker">Mijoté</p>
            <h1>{t(locale, "tagline")}</h1>
            <p className="lede">{t(locale, "hero_text")}</p>
            <div className="actions">
              <Link className="btn btn-primary" href="/inscription">{t(locale, "hero_cta")}</Link>
              <Link className="btn btn-secondary" href="/sante">{t(locale, "health_title")}</Link>
            </div>
          </div>
          <article className="card" aria-label={t(locale, "example")}>
            <div className="photo-fallback" aria-hidden="true" />
            <div className="card-body">
              <p className="kicker">{t(locale, "example")}</p>
              <h2>{locale === "en" ? "Root vegetable stew" : "Mijoté de légumes racines"}</h2>
              <p className="meta">{locale === "en" ? "Prep 15 min · Cook 35 min · 4 servings" : "Préparation 15 min · Cuisson 35 min · 4 portions"}</p>
              <p className="meta">{t(locale, "budget_note")}</p>
            </div>
          </article>
        </section>
        <section>
          <h2>{t(locale, "how_title")}</h2>
          <div className="cards">
            <article className="panel"><h3>1</h3><p>{t(locale, "how_1")}</p></article>
            <article className="panel"><h3>2</h3><p>{t(locale, "how_2")}</p></article>
            <article className="panel"><h3>3</h3><p>{t(locale, "how_3")}</p></article>
          </div>
        </section>
        <section className="cards">
          <article className="panel"><h2>{t(locale, "safety_title")}</h2><p>{t(locale, "safety_text")}</p></article>
          <article className="panel"><h2>{t(locale, "quebec_title")}</h2><p>{t(locale, "quebec_text")}</p></article>
          <article className="panel"><h2>{t(locale, "health_title")}</h2><p>{t(locale, "health_text")}</p></article>
        </section>
      </main>
      <footer className="wrap">
        <Link href="/sante">{t(locale, "health_title")}</Link> · <Link href="/confidentialite">{t(locale, "privacy")}</Link>
      </footer>
    </>
  );
}
