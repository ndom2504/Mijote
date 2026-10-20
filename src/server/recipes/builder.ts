import {
  COST_ESTIMATE_DATE,
  COST_SOURCE,
  type Allergen,
  type Contains,
  type GroceryCategory,
  type Slot,
  type Unit,
} from "@/lib/constants";
import { normalizeText } from "@/lib/text";
import { PHOTO_CREDIT, PHOTO_LICENSE, PHOTOS, type PhotoKey } from "@/server/recipes/photos";
import { scanIngredients } from "@/server/recipes/lexicon";

export type IngredientInput = {
  nameFr: string;
  nameEn: string;
  quantity: number | null;
  unit: Unit | null;
  category: GroceryCategory;
  subIngredients: string[];
};

export type CatalogRecipe = {
  id: string;
  slug: string;
  nameFr: string;
  nameEn: string;
  descriptionFr: string;
  descriptionEn: string;
  prepMinutes: number;
  cookMinutes: number;
  restMinutes: number;
  servings: number;
  costPerServingCents: number;
  costEstimatedAt: string;
  costSource: string;
  costNoteFr: string;
  costNoteEn: string;
  difficulty: "facile" | "moyen";
  seasons: string[];
  mealSlots: Slot[];
  contains: Contains;
  allergens: Allergen[];
  crossContamination: Allergen[];
  allergenDataComplete: true;
  regionName: string | null;
  regionDocumented: boolean;
  regionNoteFr: string | null;
  regionNoteEn: string | null;
  photoUrl: string;
  photoCredit: string;
  photoLicense: string;
  stepsFr: string[];
  stepsEn: string[];
  tags: string[];
  ingredients: IngredientInput[];
  hasProduce: boolean;
};

export function ingredient(
  nameFr: string,
  nameEn: string,
  quantity: number | null,
  unit: Unit | null,
  category: GroceryCategory,
  subIngredients: string[] = [],
): IngredientInput {
  return { nameFr, nameEn, quantity, unit, category, subIngredients };
}

type RecipeDraft = {
  slug: string;
  nameFr: string;
  nameEn: string;
  descriptionFr: string;
  descriptionEn: string;
  meals: Slot[];
  prep: number;
  cook: number;
  rest?: number;
  servings: number;
  cost: number;
  difficulty?: "facile" | "moyen";
  seasons?: string[];
  tags?: string[];
  photo: PhotoKey;
  ingredients: IngredientInput[];
  stepsFr: string[];
  stepsEn: string[];
  region?: boolean;
  extraCross?: Allergen[];
};

const REGION_FR = "Plat associé à la cuisine familiale québécoise. Cette mention n'est pas une mesure de popularité ni une tendance en temps réel.";
const REGION_EN = "Associated with Quebec home cooking. This is not a measured trend or a popularity score.";

export function recipe(draft: RecipeDraft): CatalogRecipe {
  const scan = scanIngredients(draft.ingredients);
  const animal = scan.contains.pork || scan.contains.beef || scan.contains.poultry || scan.contains.fish || scan.contains.shellfish;
  const minutes = draft.prep + draft.cook;
  const tags = new Set(draft.tags ?? []);
  if (animal && tags.has("vegetarien")) {
    throw new Error(`${draft.slug} est marquée végétarienne alors qu'elle contient de la viande ou du poisson.`);
  }
  if (!animal) tags.add("vegetarien");
  const hasTofu = draft.ingredients.some((item) => normalizeText(item.nameFr).includes("tofu"));
  if (animal || scan.contains.egg || scan.contains.legume || hasTofu || scan.contains.dairy) tags.add("proteines");
  if (tags.has("rapide") && minutes > 35) throw new Error(`${draft.slug} est marquée rapide, mais dure ${minutes} min.`);
  if (tags.has("economique") && draft.cost > 375) throw new Error(`${draft.slug} est marquée économique, mais coûte ${draft.cost} ¢.`);
  if (draft.ingredients.length < 3) throw new Error(`${draft.slug} n'a pas assez d'ingrédients.`);
  if (draft.stepsFr.length < 3 || draft.stepsEn.length < 3) throw new Error(`${draft.slug} n'a pas assez d'étapes.`);
  const produce = draft.ingredients.filter((item) => item.category === "fruits_legumes").length;
  return {
    id: `recipe-${draft.slug}`,
    slug: draft.slug,
    nameFr: draft.nameFr,
    nameEn: draft.nameEn,
    descriptionFr: draft.descriptionFr,
    descriptionEn: draft.descriptionEn,
    prepMinutes: draft.prep,
    cookMinutes: draft.cook,
    restMinutes: draft.rest ?? 0,
    servings: draft.servings,
    costPerServingCents: draft.cost,
    costEstimatedAt: COST_ESTIMATE_DATE,
    costSource: COST_SOURCE,
    costNoteFr: "Estimation interne du 19 octobre 2026, à titre indicatif. Ce n'est pas un prix relevé en épicerie.",
    costNoteEn: "Internal estimate dated 19 October 2026. This is not a grocery-store price.",
    difficulty: draft.difficulty ?? "facile",
    seasons: draft.seasons ?? ["toute"],
    mealSlots: draft.meals,
    contains: scan.contains,
    allergens: scan.allergens,
    crossContamination: [...new Set([...scan.crossContamination, ...(draft.extraCross ?? [])])],
    allergenDataComplete: true,
    regionName: draft.region ? "Québec" : null,
    regionDocumented: Boolean(draft.region),
    regionNoteFr: draft.region ? REGION_FR : null,
    regionNoteEn: draft.region ? REGION_EN : null,
    photoUrl: PHOTOS[draft.photo],
    photoCredit: PHOTO_CREDIT,
    photoLicense: PHOTO_LICENSE,
    stepsFr: draft.stepsFr,
    stepsEn: draft.stepsEn,
    tags: [...tags],
    ingredients: draft.ingredients,
    hasProduce: produce > 0,
  };
}
