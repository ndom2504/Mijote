import Link from "next/link";
import { getLocale } from "@/server/i18n/locale";
import { t } from "@/lib/i18n";

export default async function Page() {
  const locale = await getLocale();
  return (
    <main id="contenu" className="wrap main">
      <Link className="logo" href="/"><span className="logo-mark" aria-hidden="true" />Mijoté</Link>
      <h1>{t(locale, "health_title")}</h1>
      <div className="panel">
        <p>{t(locale, "health_text")}</p>
        <p>{t(locale, "no_medical")}</p>
        <p>{t(locale, "emergency")}</p>
        <p>
          <a href="https://guide-alimentaire.canada.ca/fr/">{t(locale, "guide")}</a>
        </p>
        <p>{t(locale, "safety_text")}</p>
      </div>
    </main>
  );
}
