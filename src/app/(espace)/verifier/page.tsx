import { VerifyForm } from "@/components/AuthForms";
import { currentUser } from "@/server/auth/current";
import { redirect } from "next/navigation";

export default async function Page() {
  const user = await currentUser();
  if (!user) redirect("/connexion");
  return <VerifyForm locale={user.locale} />;
}
