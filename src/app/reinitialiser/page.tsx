import { ResetForm } from "@/components/AuthForms";
import { getLocale } from "@/server/i18n/locale";

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const params = await searchParams;
  return <ResetForm locale={await getLocale()} token={params.token ?? ""} />;
}
