import { filterSafe } from "./allergens";
import { normalizeSearch } from "../lib/format";
import type { Catalog, Country, Recipe } from "./types";

/** Recherche par nom de recette ou par pays d'origine (sans accents ni casse). */
export function searchRecipes(recipes: Recipe[], term: string): Recipe[] {
  const needle = normalizeSearch(term);
  if (!needle) return recipes;
  return recipes.filter((recipe) => normalizeSearch(`${recipe.name} ${recipe.origin?.name ?? ""}`).includes(needle));
}

/**
 * Catalogue affichable : masque aussi, côté appareil, toute recette touchant à une allergie déclarée
 * (le serveur filtre déjà ; ceci protège contre une réponse périmée après un changement d'allergies).
 */
export function visibleCatalog(catalog: Catalog, declaredAllergens: string[]): Catalog {
  const recipes = filterSafe(catalog.recipes, declaredAllergens);
  return { recipes, hiddenCount: catalog.hiddenCount + (catalog.recipes.length - recipes.length) };
}

export interface OriginGroup {
  country: Country;
  recipes: Recipe[];
}

/** Regroupe les recettes par pays d'origine ; les pays sont triés par nombre de recettes puis par nom. */
export function groupByOrigin(recipes: Recipe[]): OriginGroup[] {
  const groups = new Map<string, OriginGroup>();
  for (const recipe of recipes) {
    if (!recipe.origin) continue;
    const group = groups.get(recipe.origin.code) ?? { country: recipe.origin, recipes: [] };
    group.recipes.push(recipe);
    groups.set(recipe.origin.code, group);
  }
  return [...groups.values()].sort((a, b) => b.recipes.length - a.recipes.length || a.country.name.localeCompare(b.country.name, "fr"));
}
