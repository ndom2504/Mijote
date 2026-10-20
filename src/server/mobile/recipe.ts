import { countryByCode } from "@/lib/countries";
import type { presentRecipe } from "@/server/menus/service";
import { originOf } from "@/server/recipes/origins";

type RecipeView = ReturnType<typeof presentRecipe>;

/** Forme d'une recette envoyée à l'application mobile (une seule définition pour toutes les routes). */
export function mobileRecipe(view: RecipeView) {
  return {
    id: view.id,
    slug: view.slug,
    name: view.name,
    description: view.description,
    photoUrl: view.photoUrl,
    photoCredit: view.photoCredit,
    prepMinutes: view.prepMinutes,
    cookMinutes: view.cookMinutes,
    servings: view.baseServings,
    difficulty: view.difficulty,
    costNote: view.costNote,
    allergens: view.allergens,
    mayContain: view.crossContamination,
    ingredients: view.ingredients.map((item) => ({ name: item.name, quantity: item.quantity, unit: item.unit })),
    steps: view.steps,
    origin: countryByCode(originOf(view.slug)),
  };
}
