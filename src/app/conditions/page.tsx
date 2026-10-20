import Link from "next/link";
import { getLocale } from "@/server/i18n/locale";
import { t } from "@/lib/i18n";

export default async function Page() {
  const locale = await getLocale();
  const en = locale === "en";
  return (
    <main id="contenu" className="wrap main">
      <Link className="logo" href="/"><span className="logo-mark" aria-hidden="true" />Mijoté</Link>
      <h1>{en ? "Terms of use" : "Conditions d'utilisation"}</h1>
      <div className="panel">
        <p className="notice">
          {en
            ? "Starting version. A legal professional should review these terms before public release."
            : "Version de départ. Un professionnel du droit devrait réviser ces conditions avant le lancement public."}
        </p>
        <p>
          {en
            ? "Mijoté suggests recipes and menus from a catalog. Suggestions are general information. They are not medical, dietary or allergy advice."
            : "Mijoté propose des recettes et des menus à partir d'un catalogue. Les suggestions sont des renseignements généraux. Elles ne constituent ni un avis médical, ni un avis diététique, ni un avis sur les allergies."}
        </p>
        <p>
          {en
            ? "Always read product labels. If you live with a serious allergy or a medical condition, speak with a qualified professional."
            : "Lisez toujours les étiquettes des produits. Si vous vivez avec une allergie grave ou une condition médicale, parlez à un professionnel qualifié."}
        </p>
        <p>
          {en
            ? "You are responsible for keeping your sign-in methods private. You can sign out at any time, and you can ask to delete your account and data."
            : "Vous êtes responsable de garder vos méthodes de connexion confidentielles. Vous pouvez vous déconnecter en tout temps et demander la suppression de votre compte et de vos données."}
        </p>
        <p>
          <Link href="/confidentialite">{t(locale, "privacy")}</Link>
        </p>
      </div>
    </main>
  );
}
