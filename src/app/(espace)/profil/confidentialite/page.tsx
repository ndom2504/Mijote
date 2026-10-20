import { currentUser } from "@/server/auth/current";
import { AccountForms } from "@/components/AccountForms";
import { t } from "@/lib/i18n";
import { redirect } from "next/navigation";

export default async function Page() {
  const user = await currentUser();
  if (!user) redirect("/connexion");
  return (
    <>
      <h1>{t(user.locale, "privacy")}</h1>
      <AccountForms locale={user.locale} />
    </>
  );
}
