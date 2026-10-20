import Link from "next/link";
import { currentUser } from "@/server/auth/current";
import { todayBoard } from "@/server/menus/service";
import { aiConfigured } from "@/server/ai/provider";
import { formatCad, formatLongDate, formatMinutes } from "@/lib/date";
import { t } from "@/lib/i18n";
import { MealGrid, MenuActions } from "@/components/Meals";
import { redirect } from "next/navigation";

export default async function Page() {
  const user = await currentUser();
  if (!user) redirect("/connexion");
  const board = await todayBoard(user.id, user.locale);
  const name = board.profile?.firstName || user.firstName;
  return (
    <>
      <p className="kicker">{formatLongDate(board.date, user.locale)}</p>
      <h1>{name ? `${t(user.locale, "hello")} ${name}` : t(user.locale, "hello")}</h1>
      <p className="meta">{board.profile?.municipalityName ? `${board.profile.municipalityName}${board.profile.regionName ? ` · ${board.profile.regionName}` : ""}` : t(user.locale, "city_missing")}</p>
      {!aiConfigured() ? <p className="notice info">{t(user.locale, "ai_off")}</p> : null}
      <div className="cards">
        <article className="panel">
          <h2>{t(user.locale, "prep")}</h2>
          <p>{formatMinutes(board.minutes, user.locale)}</p>
          <p className="meta">{t(user.locale, "time_note")}</p>
        </article>
        <article className="panel">
          <h2>{t(user.locale, "day_cost")}</h2>
          <p>{board.costCents == null ? t(user.locale, "nutrition_missing") : formatCad(board.costCents, user.locale)}</p>
          <p className="meta">{t(user.locale, "budget_note")}</p>
        </article>
        <article className="panel">
          <h2>{t(user.locale, "variety")}</h2>
          <p>{board.variety.text}</p>
          <p className="meta">{t(user.locale, "variety_note")}</p>
        </article>
      </div>
      <div className="actions">
        <MenuActions locale={user.locale} scope="today" />
        <Link className="btn btn-secondary" href="/epicerie">{t(user.locale, "grocery_link")}</Link>
      </div>
      <MealGrid locale={user.locale} meals={board.meals} />
    </>
  );
}
