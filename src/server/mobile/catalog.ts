import { normalizeText } from "@/lib/text";
import { rejectReason, type EngineProfile, type EngineRecipe } from "@/server/recommendations/engine";

export type CatalogEntry = { recipe: EngineRecipe; name: string; originName: string };

/**
 * Catalogue visible par une personne. Une recette qui contient (ou peut contenir) un allergène déclaré, qui
 * enfreint son régime, contient un ingrédient exclu ou dont les données d'allergènes sont incomplètes est masquée.
 * Le temps et le budget ne masquent rien : ce sont des préférences, pas des interdits.
 * `hiddenCount` compte les recettes masquées pour ces raisons (la recherche n'y change rien).
 */
export function visibleCatalog(
  entries: CatalogEntry[],
  profile: EngineProfile,
  search = "",
): { visible: CatalogEntry[]; hiddenCount: number } {
  const diets = profile.diets.length ? profile.diets : (["omnivore"] as EngineProfile["diets"]);
  const safe = entries.filter(
    (entry) =>
      rejectReason(entry.recipe, profile, entry.recipe.mealSlots[0] ?? "dinner", { relaxTime: true, relaxBudget: true, diets }) === null,
  );
  const needle = normalizeText(search);
  const visible = needle ? safe.filter((entry) => normalizeText(`${entry.name} ${entry.originName}`).includes(needle)) : safe;
  return { visible, hiddenCount: entries.length - safe.length };
}
