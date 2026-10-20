import Link from "next/link";
import { getLocale } from "@/server/i18n/locale";
import { t } from "@/lib/i18n";

export default async function Page() {
  const locale = await getLocale();
  return (
    <main id="contenu" className="wrap main">
      <Link className="logo" href="/"><span className="logo-mark" aria-hidden="true" />Mijoté</Link>
      <h1>{t(locale, "privacy")}</h1>
      <div className="panel">
        <p>
          {locale === "en"
            ? "Mijoté stores your email, a password hash, food preferences, allergies, menus, favorites and grocery lists. These details stay tied to your account. Location is optional and chosen by you. GPS is not required."
            : "Mijoté conserve votre courriel, un mot de passe chiffré, vos préférences alimentaires, vos allergies, vos menus, vos favoris et vos listes d'épicerie. Ces renseignements restent liés à votre compte. La municipalité est facultative et choisie par vous. Le GPS n'est pas exigé."}
        </p>
        <p>
          {locale === "en"
            ? "Allergies are requested only to exclude known incompatible recipes. They are not a medical file. You can download or delete your data from your account."
            : "Les allergies servent uniquement à écarter les recettes incompatibles connues. Elles ne constituent pas un dossier médical. Vous pouvez télécharger ou supprimer vos données depuis votre compte."}
        </p>
        <p>
          {locale === "en"
            ? "If you sign in with Google, Mijoté keeps your Google account identifier and your verified email. It never receives your Google password. If you sign in by phone, Mijoté keeps your phone number, and verification codes are sent by SMS through Twilio Verify. Your carrier's message fees may apply."
            : "Si vous vous connectez avec Google, Mijoté conserve l'identifiant de votre compte Google et votre courriel vérifié. Mijoté ne reçoit jamais votre mot de passe Google. Si vous vous connectez par téléphone, Mijoté conserve votre numéro, et les codes de vérification sont envoyés par SMS grâce à Twilio Verify. Les frais de messagerie de votre opérateur peuvent s'appliquer."}
        </p>
        <p>{t(locale, "no_medical")}</p>
      </div>
    </main>
  );
}
