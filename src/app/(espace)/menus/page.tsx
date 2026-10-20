import { currentUser } from "@/server/auth/current";
import { readPlans } from "@/server/menus/service";
import { addDays, formatLongDate, todayInQuebec, weekStartMonday } from "@/lib/date";
import { t } from "@/lib/i18n";
import { MealGrid, MenuActions } from "@/components/Meals";
import { redirect } from "next/navigation";

export default async function Page() {
  const user = await currentUser();
  if (!user) redirect("/connexion");
  const today = todayInQuebec();
  const start = weekStartMonday(today);
  const meals = await readPlans(user.id, addDays(today, -14), addDays(start, 6), user.locale);
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
  const past = meals.filter((meal) => meal.date < today);
  return (
    <>
      <h1>{t(user.locale, "nav_menus")}</h1>
      <p className="meta">{t(user.locale, "week")} {formatLongDate(start, user.locale)}</p>
      <MenuActions locale={user.locale} scope="week" />
      {days.map((date) => {
        const dayMeals = meals.filter((meal) => meal.date === date);
        return (
          <section key={date}>
            <h2>{formatLongDate(date, user.locale)}</h2>
            <MealGrid locale={user.locale} meals={dayMeals} empty={dayMeals.length === 0} />
          </section>
        );
      })}
      <h2>{t(user.locale, "history")}</h2>
      {past.length === 0 ? <p className="notice info">{t(user.locale, "empty_history")}</p> : null}
      {Array.from(new Set(past.map((meal) => meal.date))).map((date) => (
        <section key={date}>
          <h3>{formatLongDate(date, user.locale)}</h3>
          <MealGrid locale={user.locale} meals={past.filter((meal) => meal.date === date)} />
        </section>
      ))}
    </>
  );
}
