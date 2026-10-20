import Link from "next/link";
import { currentUser } from "@/server/auth/current";
import { getProfile } from "@/server/profile/service";
import { publishedRecipes, toEngineRecipe } from "@/server/recipes/repository";
import { presentRecipe } from "@/server/menus/service";
import { rejectReason } from "@/server/recommendations/engine";
import { Photo } from "@/components/Shell";
import { t } from "@/lib/i18n";
import { redirect } from "next/navigation";

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; ok?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/connexion");
  const params = await searchParams;
  const query = (params.q ?? "").trim().toLocaleLowerCase("fr-CA");
  const onlySafe = params.ok === "1";
  const profile = await getProfile(user.id);
  const recipes = await publishedRecipes();
  const cards = recipes
    .map((recipe) => {
      const view = presentRecipe(recipe, user.locale);
      const engine = toEngineRecipe(recipe);
      const safe = profile
        ? recipe.mealSlots.some((slot) => rejectReason(engine, {
            diets: profile.diets,
            allergens: profile.allergens,
            excludedIngredients: profile.otherExclusions,
            breakfastPrefs: profile.breakfastPrefs,
            lunchPrefs: profile.lunchPrefs,
            dinnerPrefs: profile.dinnerPrefs,
            cookingTimeMinutes: profile.cookingTimeMinutes,
            weeklyBudgetCents: profile.weeklyBudgetCents,
            householdSize: profile.householdSize,
            region: profile.regionName,
          }, slot, { relaxTime: true, relaxBudget: true }) == null)
        : true;
      return { view, safe };
    })
    .filter((item) => !query || item.view.name.toLocaleLowerCase("fr-CA").includes(query))
    .filter((item) => !onlySafe || item.safe);

  return (
    <>
      <h1>{t(user.locale, "catalog")}</h1>
      <form className="panel" method="get">
        <label htmlFor="q">{t(user.locale, "search")}</label>
        <input id="q" name="q" defaultValue={params.q ?? ""} />
        <label className="chip"><input type="checkbox" name="ok" value="1" defaultChecked={onlySafe} /> {t(user.locale, "compatible")}</label>
        <button className="btn btn-primary" type="submit">{t(user.locale, "search")}</button>
      </form>
      <p className="meta">{cards.length}</p>
      <div className="meal-grid">
        {cards.map(({ view, safe }) => (
          <article className="card" key={view.id}>
            <Photo src={view.photoUrl} />
            <div className="card-body">
              <h2>{view.name}</h2>
              <p className="meta">{safe ? t(user.locale, "compatible") : t(user.locale, "incomplete")}</p>
              <Link className="btn btn-primary" href={`/recettes/${view.slug}`}>{t(user.locale, "see_recipe")}</Link>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
