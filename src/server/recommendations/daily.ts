import type { Slot } from "@/lib/constants";
import { rejectReason, type EngineProfile, type EngineRecipe } from "@/server/recommendations/engine";

export type DailyCandidate = {
  id: string;
  slug: string;
  mealSlots: Slot[];
  allergens: string[];
  crossContamination: string[];
  origin: string | null;
};

export function mealSlotForHour(hour: number): Slot {
  if (hour >= 5 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 16) return "lunch";
  return "dinner";
}

/**
 * Recettes admissibles pour la recette du jour : allergies, contamination croisée, exclusions et régime sont
 * toujours respectés ; le temps souhaité l'est tant qu'une recette y répond. Le budget n'intervient pas ici.
 * `relaxedTime` signale que, faute de recette dans le temps voulu, les plus longues sont admises (l'écran le dit).
 */
export function eligibleForDaily(
  recipes: EngineRecipe[],
  profile: EngineProfile,
  slot: Slot,
): { ids: Set<string>; relaxedTime: boolean } {
  const within = (relaxTime: boolean) =>
    recipes.filter((recipe) => rejectReason(recipe, profile, slot, { relaxTime, relaxBudget: true }) === null).map((recipe) => recipe.id);
  const strict = within(false);
  if (strict.length) return { ids: new Set(strict), relaxedTime: false };
  return { ids: new Set(within(true)), relaxedTime: true };
}

function hashIndex(key: string, length: number): number {
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % length;
}

function safeFor(recipe: DailyCandidate, allergens: string[], slot: Slot): boolean {
  if (!recipe.mealSlots.includes(slot)) return false;
  const blocked = new Set(allergens);
  if (recipe.allergens.some((code) => blocked.has(code))) return false;
  if (recipe.crossContamination.some((code) => blocked.has(code))) return false;
  return true;
}

export function pickDaily(
  recipes: DailyCandidate[],
  input: { country: string; slot: Slot; date: string; userId: string; allergens: string[] },
): { recipe: DailyCandidate; match: "locale" | "internationale" } | null {
  const safe = recipes.filter((recipe) => safeFor(recipe, input.allergens, input.slot));
  const local = safe.filter((recipe) => recipe.origin === input.country);
  const pool = local.length ? local : safe;
  if (!pool.length) return null;
  const recipe = pool[hashIndex(`${input.userId}:${input.date}:${input.slot}:${input.country}`, pool.length)];
  return { recipe, match: local.length ? "locale" : "internationale" };
}
