import { describe, expect, it } from "vitest";
import { EMPTY_CONTAINS, type Allergen } from "@/lib/constants";
import { pickForSlot, rejectReason, type EngineProfile, type EngineRecipe } from "@/server/recommendations/engine";

function recipe(partial: Partial<EngineRecipe> & Pick<EngineRecipe, "id" | "slug">): EngineRecipe {
  return {
    nameFr: partial.slug,
    nameEn: partial.slug,
    mealSlots: ["dinner"],
    prepMinutes: 10,
    cookMinutes: 10,
    servings: 2,
    costPerServingCents: 200,
    seasons: ["toute"],
    tags: [],
    allergens: [],
    crossContamination: [],
    contains: { ...EMPTY_CONTAINS },
    ingredientNames: [],
    region: null,
    regionDocumented: false,
    popularity: 0,
    allergenDataComplete: true,
    hasProduce: true,
    ...partial,
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
  weeklyBudgetCents: 21000,
  householdSize: 1,
  region: "Montréal",
};

const base = {
  recipes: [] as EngineRecipe[],
  profile,
  slot: "dinner" as const,
  season: "automne",
  recentIds: [] as string[],
  olderIds: [] as string[],
  likedIds: [] as string[],
  dislikedIds: [] as string[],
  excludeIds: [] as string[],
  dayProteins: [] as string[],
  recentIngredients: [] as string[],
};

describe("moteur de recommandations", () => {
  it("exclut un allergène connu avant tout score de popularité", () => {
    const peanut = recipe({
      id: "peanut",
      slug: "peanut",
      allergens: ["peanuts"],
      popularity: 1000,
      tags: ["familial"],
    });
    const plain = recipe({ id: "plain", slug: "plain", popularity: 0 });
    expect(rejectReason(peanut, { ...profile, allergens: ["peanuts"] }, "dinner")).toBe("allergen");
    const picked = pickForSlot({ ...base, recipes: [peanut, plain], profile: { ...profile, allergens: ["peanuts"] } });
    expect(picked?.recipe.id).toBe("plain");
  });

  it("n'assouplit jamais une allergie, un régime ou une exclusion", () => {
    const beef = recipe({ id: "beef", slug: "beef", contains: { ...EMPTY_CONTAINS, beef: true }, costPerServingCents: 50 });
    expect(rejectReason(beef, { ...profile, diets: ["vegetarian"] }, "dinner", { relaxBudget: true, relaxTime: true })).toBe("diet");
    const oats = recipe({ id: "oats", slug: "oats", crossContamination: ["wheat_gluten"] as Allergen[] });
    expect(rejectReason(oats, { ...profile, allergens: ["wheat_gluten"] }, "dinner")).toBe("cross");
    const cilantro = recipe({ id: "herb", slug: "herb", ingredientNames: ["coriandre fraiche"] });
    expect(rejectReason(cilantro, { ...profile, excludedIngredients: ["coriandre"] }, "dinner")).toBe("exclusion");
    expect(pickForSlot({ ...base, recipes: [beef], profile: { ...profile, diets: ["vegan"] } })).toBeNull();
  });

  it("peut assouplir le temps ou le budget, pas la sécurité", () => {
    const slow = recipe({ id: "slow", slug: "slow", prepMinutes: 50, cookMinutes: 40, costPerServingCents: 100 });
    const pricey = recipe({ id: "pricey", slug: "pricey", costPerServingCents: 5000 });
    const timed = pickForSlot({ ...base, recipes: [slow], profile: { ...profile, cookingTimeMinutes: 15 } });
    expect(timed?.recipe.id).toBe("slow");
    expect(timed?.relaxed).toContain("time");
    const priced = pickForSlot({ ...base, recipes: [pricey], profile: { ...profile, weeklyBudgetCents: 2100, householdSize: 1 } });
    expect(priced?.relaxed).toContain("budget");
    const unsafe = recipe({ id: "unsafe", slug: "unsafe", allergens: ["milk"], prepMinutes: 80 });
    expect(pickForSlot({ ...base, recipes: [unsafe], profile: { ...profile, allergens: ["milk"], cookingTimeMinutes: 10 } })).toBeNull();
  });

  it("privilégie une recette aimée et évite une recette récente", () => {
    const liked = recipe({ id: "liked", slug: "liked" });
    const other = recipe({ id: "other", slug: "other" });
    expect(pickForSlot({ ...base, recipes: [other, liked], likedIds: ["liked"] })?.recipe.id).toBe("liked");
    const recent = recipe({ id: "recent", slug: "recent" });
    const fresh = recipe({ id: "fresh", slug: "fresh" });
    expect(pickForSlot({ ...base, recipes: [recent, fresh], recentIds: ["recent"] })?.recipe.id).toBe("fresh");
  });

  it("respecte le créneau du repas", () => {
    const breakfast = recipe({ id: "am", slug: "am", mealSlots: ["breakfast"] });
    expect(pickForSlot({ ...base, recipes: [breakfast], slot: "dinner" })).toBeNull();
    expect(pickForSlot({ ...base, recipes: [breakfast], slot: "breakfast" })?.recipe.id).toBe("am");
  });
});
