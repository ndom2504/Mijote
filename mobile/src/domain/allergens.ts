import type { Recipe } from "./types";
import { ALLERGENS, labelOf } from "./options";

export interface AllergenHits {
  /** Allergènes déclarés que la recette contient. */
  contains: string[];
  /** Allergènes déclarés que la recette peut contenir par contamination croisée. */
  mayContain: string[];
}

export function allergenLabel(code: string): string {
  return labelOf(ALLERGENS, code);
}

export function allergenList(codes: string[]): string {
  return codes.map(allergenLabel).join(", ");
}

/** Croise les allergènes d'une recette avec ceux que la personne a déclarés. */
export function allergenHits(recipe: Pick<Recipe, "allergens" | "mayContain">, declared: string[]): AllergenHits {
  const blocked = new Set(declared);
  const contains = recipe.allergens.filter((code) => blocked.has(code));
  const mayContain = recipe.mayContain.filter((code) => blocked.has(code) && !contains.includes(code));
  return { contains, mayContain };
}

export function isUnsafe(hits: AllergenHits): boolean {
  return hits.contains.length > 0 || hits.mayContain.length > 0;
}

/** Phrase d'avertissement courte (badge, accessibilité), ou null si la recette ne touche à aucune allergie déclarée. */
export function warningText(hits: AllergenHits): string | null {
  if (hits.contains.length > 0) return `Contient : ${allergenList(hits.contains)}`;
  if (hits.mayContain.length > 0) return `Peut contenir : ${allergenList(hits.mayContain)}`;
  return null;
}

/** Recettes d'une liste qui touchent à une allergie déclarée (favoris, sauvegardes). */
export function recipesAtRisk(recipes: Recipe[], declared: string[]): Recipe[] {
  return recipes.filter((recipe) => isUnsafe(allergenHits(recipe, declared)));
}

/** Retire de la liste toute recette qui touche à une allergie déclarée (défense en profondeur côté appareil). */
export function filterSafe(recipes: Recipe[], declared: string[]): Recipe[] {
  return recipes.filter((recipe) => !isUnsafe(allergenHits(recipe, declared)));
}
