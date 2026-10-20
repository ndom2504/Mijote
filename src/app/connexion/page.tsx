import { LoginForm } from "@/components/AuthForms";
import { getLocale } from "@/server/i18n/locale";
import { currentUser } from "@/server/auth/current";
import { redirect } from "next/navigation";

function safeNext(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/aujourd-hui";
  return value;
}

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await currentUser();
  if (user?.emailVerified && user.onboardingCompleted) redirect("/aujourd-hui");
  const params = await searchParams;
  const locale = await getLocale();
  return <LoginForm locale={locale} nextPath={safeNext(params.next)} />;
}
