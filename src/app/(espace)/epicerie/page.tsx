import { currentUser } from "@/server/auth/current";
import { groceryList } from "@/server/grocery/service";
import { todayInQuebec, weekStartMonday, formatLongDate } from "@/lib/date";
import { t } from "@/lib/i18n";
import { GroceryView } from "@/components/GroceryView";
import { redirect } from "next/navigation";

export default async function Page() {
  const user = await currentUser();
  if (!user) redirect("/connexion");
  const today = todayInQuebec();
  const list = await groceryList(user.id, today);
  return (
    <>
      <h1>{t(user.locale, "nav_grocery")}</h1>
      <p className="meta">{t(user.locale, "week")} {formatLongDate(weekStartMonday(today), user.locale)}</p>
      <p className="meta">{t(user.locale, "budget_note")}</p>
      <GroceryView locale={user.locale} items={list.items} />
    </>
  );
}
