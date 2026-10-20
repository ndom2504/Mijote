import { describe, expect, it } from "vitest";
import { EMPTY_CONTAINS } from "@/lib/constants";
import { visibleCatalog, type CatalogEntry } from "@/server/mobile/catalog";
import { eligibleForDaily } from "@/server/recommendations/daily";
import type { EngineProfile, EngineRecipe } from "@/server/recommendations/engine";

function recipe(overrides: Partial<EngineRecipe> & { id: string }): EngineRecipe {
  return {
    slug: overrides.id,
    nameFr: overrides.id,
    nameEn: overrides.id,
    mealSlots: ["dinner"],
    prepMinutes: 10,
    cookMinutes: 20,
    servings: 2,
    costPerServingCents: null,
    seasons: ["toute"],
    tags: [],
    allergens: [],
    crossContamination: [],
    contains: { ...EMPTY_CONTAINS },
    ingredientNames: ["riz"],
    region: null,
    regionDocumented: false,
    popularity: 0,
    allergenDataComplete: true,
    hasProduce: false,
    ...overrides,
  };
}

const profile: EngineProfile = {
  diets: ["omnivore"],
  allergens: [],
  excludedIngredients: [],
  breakfastPrefs: [],
  lunchPrefs: [],
  dinnerPrefs: [],
  cookingTimeMinutes: 45,
  weeklyBudgetCents: 0,
  householdSize: 2,
  region: null,
};

const entry = (value: EngineRecipe, originName = ""): CatalogEntry => ({ recipe: value, name: value.nameFr, originName });

describe("catalogue visible", () => {
  const entries = [
    entry(recipe({ id: "arachide", allergens: ["peanuts"] })),
    entry(recipe({ id: "trace", crossContamination: ["peanuts"] })),
    entry(recipe({ id: "porc", contains: { ...EMPTY_CONTAINS, pork: true } })),
    entry(recipe({ id: "coriandre", ingredientNames: ["coriandre fraiche"] })),
    entry(recipe({ id: "incomplet", allergenDataComplete: false })),
    entry(recipe({ id: "simple" }), "Canada"),
    entry(recipe({ id: "long", prepMinutes: 90, cookMinutes: 60 }), "Italie"),
  ];

  it("masque les allergènes déclarés, les traces, le régime, les exclusions et les données incomplètes", () => {
    const strict: EngineProfile = { ...profile, allergens: ["peanuts"], diets: ["vegetarian"], excludedIngredients: ["coriandre"] };
    const { visible, hiddenCount } = visibleCatalog(entries, strict);
    expect(visible.map((item) => item.recipe.id).sort()).toEqual(["long", "simple"]);
    expect(hiddenCount).toBe(5);
  });

  it("n'écarte aucune recette sans allergie ni contrainte, y compris les plus longues", () => {
    const { visible, hiddenCount } = visibleCatalog(entries, profile);
    expect(visible.map((item) => item.recipe.id)).toContain("long");
    expect(hiddenCount).toBe(0);
  });

  it("recherche par nom ou par origine sans modifier le décompte des masquées", () => {
    const strict: EngineProfile = { ...profile, allergens: ["peanuts"] };
    expect(visibleCatalog(entries, strict, "canada").visible.map((item) => item.recipe.id)).toEqual(["simple"]);
    expect(visibleCatalog(entries, strict, "italie").visible.map((item) => item.recipe.id)).toEqual(["long"]);
    expect(visibleCatalog(entries, strict, "canada").hiddenCount).toBe(visibleCatalog(entries, strict).hiddenCount);
  });
});

describe("admissibilité de la recette du jour", () => {
  const list = [
    recipe({ id: "rapide", prepMinutes: 10, cookMinutes: 10 }),
    recipe({ id: "long", prepMinutes: 60, cookMinutes: 60 }),
    recipe({ id: "arachide", prepMinutes: 5, cookMinutes: 5, allergens: ["peanuts"] }),
  ];

  it("respecte le temps souhaité quand une recette y répond", () => {
    const result = eligibleForDaily(list, { ...profile, allergens: ["peanuts"] }, "dinner");
    expect([...result.ids]).toEqual(["rapide"]);
    expect(result.relaxedTime).toBe(false);
  });

  it("n'élargit le temps qu'en le signalant, et jamais les allergies", () => {
    const result = eligibleForDaily(list, { ...profile, allergens: ["peanuts"], cookingTimeMinutes: 10 }, "dinner");
    expect(result.relaxedTime).toBe(true);
    expect([...result.ids].sort()).toEqual(["long", "rapide"]);
    expect(result.ids.has("arachide")).toBe(false);
  });

  it("applique le régime et les exclusions", () => {
    const meat = recipe({ id: "viande", contains: { ...EMPTY_CONTAINS, beef: true } });
    const result = eligibleForDaily([meat, ...list], { ...profile, diets: ["vegetarian"], excludedIngredients: ["riz"] }, "dinner");
    expect(result.ids.size).toBe(0);
  });
});
