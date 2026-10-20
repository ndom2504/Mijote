import { ForgotForm } from "@/components/AuthForms";
import { getLocale } from "@/server/i18n/locale";

export default async function Page() {
  return <ForgotForm locale={await getLocale()} />;
}
