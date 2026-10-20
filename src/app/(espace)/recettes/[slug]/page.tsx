import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/server/auth/current";
import { listFavorites, presentRecipe, readPlans } from "@/server/menus/service";
import { recipeBySlug } from "@/server/recipes/repository";
import { addDays, todayInQuebec, weekStartMonday } from "@/lib/date";
import { t } from "@/lib/i18n";
import { Photo } from "@/components/Shell";
import { ServingControl } from "@/components/Meals";
import { FavoriteButton, RecipeAssist } from "@/components/RecipeTools";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/connexion");
  const { slug } = await params;
  const recipe = await recipeBySlug(slug);
  if (!recipe || recipe.status !== "published") notFound();
  const view = presentRecipe(recipe, user.locale);
  const start = weekStartMonday(todayInQuebec());
  const plans = await readPlans(user.id, start, addDays(start, 6), user.locale);
  const plan = plans.find((meal) => meal.recipe.id === recipe.id);
  const favorites = await listFavorites(user.id, user.locale);
  const favorite = favorites.some((item) => item.id === recipe.id);
  return (
    <>
      <Photo src={view.photoUrl} />
      <p className="kicker">{view.photoCredit} · {view.photoLicense}</p>
      <h1>{view.name}</h1>
      <p>{view.description}</p>
      <p className="meta">{t(user.locale, `difficulty_${view.difficulty}`)} · {view.prepMinutes + view.cookMinutes} min</p>
      <p className="meta">{view.costNote}</p>
      {view.allergens.length ? <p>{view.allergens.map((code) => t(user.locale, `allergen_${code}`)).join(", ")}</p> : null}
      {view.crossContamination.length ? <p className="notice info">{t(user.locale, "cross")}: {view.crossContamination.map((code) => t(user.locale, `allergen_${code}`)).join(", ")}</p> : null}
      {!view.allergenDataComplete ? <p className="notice info">{t(user.locale, "incomplete")}</p> : null}
      {view.regionNote ? <p className="meta">{view.regionNote}</p> : null}
      <ul>{view.markers.map((marker) => <li key={marker}>{marker}</li>)}</ul>
      <FavoriteButton locale={user.locale} recipeId={recipe.id} favorite={favorite} />
      <h2>{t(user.locale, "ingredients")}</h2>
      <ServingControl locale={user.locale} planId={plan?.planId} base={view.baseServings} current={plan?.servings ?? view.baseServings} ingredients={view.ingredients} />
      <h2>{t(user.locale, "steps")}</h2>
      <ol>{view.steps.map((step) => <li key={step}>{step}</li>)}</ol>
      <RecipeAssist locale={user.locale} recipeId={recipe.id} />
    </>
  );
}
