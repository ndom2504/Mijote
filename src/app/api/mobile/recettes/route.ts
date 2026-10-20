import { countryByCode } from "@/lib/countries";
import { fail, json, api } from "@/server/http";
import { engineProfile, presentRecipe } from "@/server/menus/service";
import { visibleCatalog } from "@/server/mobile/catalog";
import { mobileRecipe } from "@/server/mobile/recipe";
import { getProfile } from "@/server/profile/service";
import { originOf } from "@/server/recipes/origins";
import { publishedRecipes, toEngineRecipe } from "@/server/recipes/repository";

/** Catalogue filtré : les recettes qui enfreignent les allergies, le régime ou les exclusions ne sont jamais envoyées. */
export const GET = api(async (request, user) => {
  if (!user) return fail("unauthenticated", 401);
  const profile = await getProfile(user.id);
  if (!profile) return fail("not_found", 404);
  const search = (new URL(request.url).searchParams.get("q") ?? "").slice(0, 80);
  const recipes = await publishedRecipes();
  const byId = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const entries = recipes.map((recipe) => ({
    recipe: toEngineRecipe(recipe),
    name: profile.locale === "en" && recipe.nameEn ? recipe.nameEn : recipe.nameFr,
    originName: countryByCode(originOf(recipe.slug))?.name ?? "",
  }));
  const { visible, hiddenCount } = visibleCatalog(entries, engineProfile(profile), search);
  const items = visible.flatMap((entry) => {
    const stored = byId.get(entry.recipe.id);
    return stored ? [mobileRecipe(presentRecipe(stored, profile.locale))] : [];
  });
  return json({ recipes: items, hiddenCount, total: recipes.length });
}, { auth: true });
