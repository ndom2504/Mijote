import type { Allergen, Contains, Diet, Locale, Slot } from "@/lib/constants";
import { seasonOf } from "@/lib/date";
import { mentionsTerm, normalizeText } from "@/lib/text";

export const SCORE_WEIGHTS = {
  preference: 12,
  season: 8,
  comfortableTime: 6,
  comfortableBudget: 6,
  liked: 18,
  disliked: -36,
  recent: -28,
  older: -12,
  regional: 6,
  popularity: 3,
  proteinRepeat: -9,
  ingredientOverlap: -1,
};

export type EngineRecipe = {
  id: string;
  slug: string;
  nameFr: string;
  nameEn: string;
  mealSlots: Slot[];
  prepMinutes: number;
  cookMinutes: number;
  servings: number;
  costPerServingCents: number | null;
  seasons: string[];
  tags: string[];
  allergens: Allergen[];
  crossContamination: Allergen[];
  contains: Contains;
  ingredientNames: string[];
  region: string | null;
  regionDocumented: boolean;
  popularity: number;
  allergenDataComplete: boolean;
  hasProduce: boolean;
};

export type EngineProfile = {
  diets: Diet[];
  allergens: Allergen[];
  excludedIngredients: string[];
  breakfastPrefs: string[];
  lunchPrefs: string[];
  dinnerPrefs: string[];
  cookingTimeMinutes: number;
  weeklyBudgetCents: number;
  householdSize: number;
  region: string | null;
};

export type RejectCode =
  | "slot"
  | "allergen"
  | "cross"
  | "incomplete"
  | "exclusion"
  | "diet"
  | "time"
  | "budget";

type Relax = { relaxTime?: boolean; relaxBudget?: boolean };

export function totalMinutes(recipe: Pick<EngineRecipe, "prepMinutes" | "cookMinutes">): number {
  return recipe.prepMinutes + recipe.cookMinutes;
}

export function mealAllowanceCents(weeklyBudgetCents: number): number | null {
  if (weeklyBudgetCents <= 0) return null;
  return weeklyBudgetCents / 21;
}

export function householdMealCost(recipe: Pick<EngineRecipe, "costPerServingCents">, householdSize: number): number | null {
  if (recipe.costPerServingCents == null) return null;
  return recipe.costPerServingCents * householdSize;
}

export function dietsForSlot(profile: EngineProfile, slot: Slot): Diet[] {
  const diets = [...profile.diets];
  const prefs = prefsFor(profile, slot);
  if (prefs.includes("vegetarien") && !diets.includes("vegan") && !diets.includes("vegetarian")) {
    diets.push("vegetarian");
  }
  return diets.length ? diets : ["omnivore"];
}

export function allowsDiet(contains: Contains, diets: Diet[]): boolean {
  const animal = contains.pork || contains.beef || contains.poultry || contains.fish || contains.shellfish;
  const meat = contains.pork || contains.beef || contains.poultry;
  for (const diet of diets) {
    if (diet === "omnivore") continue;
    if (diet === "vegetarian" && animal) return false;
    if (diet === "vegan" && (animal || contains.dairy || contains.egg || contains.honey)) return false;
    if (diet === "pescatarian" && meat) return false;
    if (diet === "no_pork" && contains.pork) return false;
    if (diet === "no_beef" && contains.beef) return false;
  }
  return true;
}

export function prefsFor(profile: EngineProfile, slot: Slot): string[] {
  if (slot === "breakfast") return profile.breakfastPrefs;
  if (slot === "lunch") return profile.lunchPrefs;
  return profile.dinnerPrefs;
}

export function proteinKey(contains: Contains): string {
  if (contains.fish || contains.shellfish) return "fish";
  if (contains.poultry) return "poultry";
  if (contains.pork) return "pork";
  if (contains.beef) return "beef";
  if (contains.legume) return "legume";
  if (contains.egg) return "egg";
  if (contains.dairy) return "dairy";
  return "plant";
}

export function rejectReason(
  recipe: EngineRecipe,
  profile: EngineProfile,
  slot: Slot,
  options: Relax & { diets?: Diet[] } = {},
): RejectCode | null {
  if (!recipe.mealSlots.includes(slot)) return "slot";
  const userAllergens = new Set(profile.allergens);
  if (recipe.allergens.some((code) => userAllergens.has(code))) return "allergen";
  if (recipe.crossContamination.some((code) => userAllergens.has(code))) return "cross";
  const hasSafetyNeeds = profile.allergens.length > 0 || profile.excludedIngredients.length > 0;
  if (!recipe.allergenDataComplete && hasSafetyNeeds) return "incomplete";
  if (profile.excludedIngredients.some((term) => recipe.ingredientNames.some((name) => mentionsTerm(name, term)))) {
    return "exclusion";
  }
  const diets = options.diets ?? dietsForSlot(profile, slot);
  if (!allowsDiet(recipe.contains, diets)) return "diet";
  if (!options.relaxTime && totalMinutes(recipe) > profile.cookingTimeMinutes) return "time";
  const allowance = mealAllowanceCents(profile.weeklyBudgetCents);
  const cost = householdMealCost(recipe, profile.householdSize);
  if (!options.relaxBudget && allowance != null && cost != null && cost > allowance) return "budget";
  return null;
}

export type PickInput = {
  recipes: EngineRecipe[];
  profile: EngineProfile;
  slot: Slot;
  season: string;
  recentIds: string[];
  olderIds: string[];
  likedIds: string[];
  dislikedIds: string[];
  excludeIds: string[];
  dayProteins: string[];
  recentIngredients: string[];
};

export type Explanation = { fr: string[]; en: string[] };

export type PickResult = {
  recipe: EngineRecipe;
  explanation: Explanation;
  warnings: Explanation;
  relaxed: Array<"time" | "budget">;
};

function scoreRecipe(recipe: EngineRecipe, input: PickInput, diets: Diet[]): number {
  const prefs = prefsFor(input.profile, input.slot).filter((pref) => pref !== "vegetarien");
  let score = 0;
  score += prefs.filter((pref) => recipe.tags.includes(pref)).length * SCORE_WEIGHTS.preference;
  if (recipe.seasons.includes(input.season)) score += SCORE_WEIGHTS.season;
  if (totalMinutes(recipe) <= input.profile.cookingTimeMinutes * 0.7) score += SCORE_WEIGHTS.comfortableTime;
  const allowance = mealAllowanceCents(input.profile.weeklyBudgetCents);
  const cost = householdMealCost(recipe, input.profile.householdSize);
  if (allowance != null && cost != null && cost <= allowance * 0.8) score += SCORE_WEIGHTS.comfortableBudget;
  if (input.likedIds.includes(recipe.id)) score += SCORE_WEIGHTS.liked;
  if (input.dislikedIds.includes(recipe.id)) score += SCORE_WEIGHTS.disliked;
  if (input.recentIds.includes(recipe.id)) score += SCORE_WEIGHTS.recent;
  else if (input.olderIds.includes(recipe.id)) score += SCORE_WEIGHTS.older;
  if (recipe.regionDocumented && input.profile.region && normalizeText(recipe.region ?? "") === normalizeText(input.profile.region)) {
    score += SCORE_WEIGHTS.regional;
  }
  score += Math.min(recipe.popularity, 5) * SCORE_WEIGHTS.popularity;
  if (input.dayProteins.includes(proteinKey(recipe.contains))) score += SCORE_WEIGHTS.proteinRepeat;
  const overlap = recipe.ingredientNames.filter((name) => input.recentIngredients.includes(name)).length;
  score += overlap * SCORE_WEIGHTS.ingredientOverlap;
  if (diets.includes("vegetarian") || diets.includes("vegan")) {
    if (recipe.tags.includes("vegetarien")) score += 2;
  }
  return score;
}

function explain(recipe: EngineRecipe, input: PickInput, relaxed: Array<"time" | "budget">): { explanation: Explanation; warnings: Explanation } {
  const fr: string[] = [];
  const en: string[] = [];
  const prefs = prefsFor(input.profile, input.slot).filter((pref) => recipe.tags.includes(pref) && pref !== "vegetarien");
  if (prefs.length) {
    fr.push("Elle rejoint des préférences indiquées pour ce repas.");
    en.push("It matches preferences you set for this meal.");
  }
  if (!relaxed.includes("time")) {
    fr.push("Le temps de préparation et de cuisson reste dans le temps indiqué.");
    en.push("Prep and cook time stay within the time you set.");
  }
  const allowance = mealAllowanceCents(input.profile.weeklyBudgetCents);
  const cost = householdMealCost(recipe, input.profile.householdSize);
  if (allowance != null && cost != null && !relaxed.includes("budget") && cost <= allowance) {
    fr.push("Le coût estimé entre dans la part prévue de votre budget. Ce n'est pas un prix d'épicerie.");
    en.push("The internal cost estimate fits the share of your budget. It is not a store price.");
  }
  if (recipe.costPerServingCents == null) {
    fr.push("Le coût de cette recette n'a pas été estimé.");
    en.push("This recipe has no cost estimate.");
  }
  if (recipe.seasons.includes(input.season)) {
    fr.push("Certains ingrédients sont de saison au Québec. Il ne s'agit pas d'un relevé en magasin.");
    en.push("Some ingredients are in season in Quebec. This is not a store availability check.");
  }
  if (input.likedIds.includes(recipe.id)) {
    fr.push("Vous avez déjà aimé cette recette.");
    en.push("You have liked this recipe before.");
  }
  if (recipe.regionDocumented && input.profile.region && normalizeText(recipe.region ?? "") === normalizeText(input.profile.region)) {
    fr.push("Cette recette est associée à la cuisine de votre région. Ce n'est pas une tendance mesurée.");
    en.push("This recipe is associated with the cooking of your region. It is not a measured trend.");
  }
  if (!input.recentIds.includes(recipe.id)) {
    fr.push("Elle n'a pas été proposée au cours des sept derniers jours.");
    en.push("It has not been suggested in the past seven days.");
  }
  fr.push("Les allergènes connus de la recette ont été comparés à votre profil avant le classement. Cela ne garantit pas l'absence de contamination non documentée.");
  en.push("Known allergens were checked against your profile before ranking. This does not guarantee the absence of undocumented contamination.");

  const warningFr: string[] = [];
  const warningEn: string[] = [];
  if (relaxed.includes("time")) {
    warningFr.push("Le temps dépasse votre maximum : aucune autre recette compatible plus courte n'était disponible.");
    warningEn.push("This takes longer than your maximum: no shorter compatible recipe was available.");
  }
  if (relaxed.includes("budget")) {
    warningFr.push("Le coût estimé dépasse la part de budget d'un repas. Les allergies n'ont pas été assouplies.");
    warningEn.push("The estimated cost is over the per-meal budget share. Allergies were not relaxed.");
  }
  if (!recipe.allergenDataComplete) {
    warningFr.push("Les données allergènes sont incomplètes. Mijoté ne peut pas confirmer la compatibilité.");
    warningEn.push("Allergen data is incomplete. Mijoté cannot confirm compatibility.");
  }
  if (recipe.crossContamination.length) {
    warningFr.push("Un risque de contact avec un allergène est documenté pour cette recette.");
    warningEn.push("A documented cross-contact risk applies to this recipe.");
  }
  return { explanation: { fr, en }, warnings: { fr: warningFr, en: warningEn } };
}

export function pickForSlot(input: PickInput): PickResult | null {
  const diets = dietsForSlot(input.profile, input.slot);
  const excluded = new Set(input.excludeIds);
  const poolFor = (relaxTime: boolean, relaxBudget: boolean) =>
    input.recipes.filter((recipe) => !excluded.has(recipe.id) && rejectReason(recipe, input.profile, input.slot, { diets, relaxTime, relaxBudget }) == null);

  let relaxed: Array<"time" | "budget"> = [];
  let pool = poolFor(false, false);
  if (pool.length === 0) {
    const timed = poolFor(true, false);
    if (timed.length) {
      pool = timed;
      relaxed = ["time"];
    }
  }
  if (pool.length === 0) {
    const priced = poolFor(false, true);
    if (priced.length) {
      pool = priced;
      relaxed = ["budget"];
    }
  }
  if (pool.length === 0) {
    const both = poolFor(true, true);
    if (both.length) {
      pool = both;
      relaxed = ["time", "budget"];
    }
  }
  if (pool.length === 0) return null;

  const ranked = [...pool].sort((a, b) => {
    const diff = scoreRecipe(b, input, diets) - scoreRecipe(a, input, diets);
    if (diff !== 0) return diff;
    const costA = a.costPerServingCents ?? Number.MAX_SAFE_INTEGER;
    const costB = b.costPerServingCents ?? Number.MAX_SAFE_INTEGER;
    if (costA !== costB) return costA - costB;
    return a.slug.localeCompare(b.slug);
  });
  const recipe = ranked[0];
  const copy = explain(recipe, input, relaxed);
  return { recipe, relaxed, ...copy };
}

export function varietyReport(recipes: EngineRecipe[], locale: Locale): { level: "limited" | "good" | "high"; text: string } {
  const proteins = new Set(recipes.map((recipe) => proteinKey(recipe.contains)));
  const produce = recipes.filter((recipe) => recipe.hasProduce).length;
  const rich = proteins.size >= 3 && produce >= 2;
  const good = proteins.size >= 2 || produce >= 2;
  if (locale === "en") {
    if (rich) return { level: "high", text: "Today's meals use several kinds of foods." };
    if (good) return { level: "good", text: "Today's meals vary the foods on the plate." };
    return { level: "limited", text: "The foods suggested today are not very varied." };
  }
  if (rich) return { level: "high", text: "Les repas du jour proposent plusieurs types d'aliments." };
  if (good) return { level: "good", text: "Les repas du jour font varier les aliments." };
  return { level: "limited", text: "Les aliments proposés aujourd'hui varient peu." };
}

export function currentSeason(isoDate: string): string {
  return seasonOf(isoDate);
}
