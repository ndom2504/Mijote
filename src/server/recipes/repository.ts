import type { Allergen, Contains, GroceryCategory, Slot } from "@/lib/constants";
import { asBoolean, asNullableNumber, asNumber, parseJson, query } from "@/server/db/client";
import type { EngineRecipe } from "@/server/recommendations/engine";
import { normalizeText } from "@/lib/text";

export type StoredIngredient = {
  nameFr: string;
  nameEn: string;
  quantity: number | null;
  unit: string | null;
  category: GroceryCategory;
  scalable: boolean;
  subIngredients: string[];
};

export type StoredRecipe = {
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
  costPerServingCents: number | null;
  costNoteFr: string;
  costNoteEn: string;
  difficulty: string;
  seasons: string[];
  mealSlots: Slot[];
  contains: Contains;
  allergens: Allergen[];
  crossContamination: Allergen[];
  allergenDataComplete: boolean;
  regionName: string | null;
  regionDocumented: boolean;
  regionNoteFr: string | null;
  regionNoteEn: string | null;
  photoUrl: string | null;
  photoCredit: string | null;
  photoLicense: string | null;
  stepsFr: string[];
  stepsEn: string[];
  tags: string[];
  status: string;
  source: string;
  ingredients: StoredIngredient[];
  hasProduce: boolean;
};

let cache: StoredRecipe[] | null = null;

export function clearRecipeCache() {
  cache = null;
}

export function toEngineRecipe(recipe: StoredRecipe): EngineRecipe {
  return {
    id: recipe.id,
    slug: recipe.slug,
    nameFr: recipe.nameFr,
    nameEn: recipe.nameEn,
    mealSlots: recipe.mealSlots,
    prepMinutes: recipe.prepMinutes,
    cookMinutes: recipe.cookMinutes,
    servings: recipe.servings,
    costPerServingCents: recipe.costPerServingCents,
    seasons: recipe.seasons,
    tags: recipe.tags,
    allergens: recipe.allergens,
    crossContamination: recipe.crossContamination,
    contains: recipe.contains,
    ingredientNames: recipe.ingredients.flatMap((item) => [item.nameFr, ...item.subIngredients].map((name) => normalizeText(name))),
    region: recipe.regionName,
    regionDocumented: recipe.regionDocumented,
    popularity: 0,
    allergenDataComplete: recipe.allergenDataComplete,
    hasProduce: recipe.hasProduce,
  };
}

export async function allRecipes(): Promise<StoredRecipe[]> {
  if (cache) return cache;
  const rows = await query<Record<string, unknown>>("SELECT * FROM recipes ORDER BY name_fr");
  const ingredients = await query<Record<string, unknown>>("SELECT * FROM recipe_ingredients ORDER BY sort_order");
  const byRecipe = new Map<string, StoredIngredient[]>();
  for (const row of ingredients) {
    const recipeId = String(row.recipe_id);
    const list = byRecipe.get(recipeId) ?? [];
    list.push({
      nameFr: String(row.name_fr),
      nameEn: String(row.name_en ?? ""),
      quantity: asNullableNumber(row.quantity),
      unit: row.unit ? String(row.unit) : null,
      category: String(row.category) as GroceryCategory,
      scalable: asBoolean(row.scalable),
      subIngredients: parseJson<string[]>(row.sub_ingredients, []),
    });
    byRecipe.set(recipeId, list);
  }
  cache = rows.map((row) => {
    const items = byRecipe.get(String(row.id)) ?? [];
    return {
      id: String(row.id),
      slug: String(row.slug),
      nameFr: String(row.name_fr),
      nameEn: String(row.name_en ?? ""),
      descriptionFr: String(row.description_fr),
      descriptionEn: String(row.description_en ?? ""),
      prepMinutes: asNumber(row.prep_minutes),
      cookMinutes: asNumber(row.cook_minutes),
      restMinutes: asNumber(row.rest_minutes),
      servings: asNumber(row.servings, 1),
      costPerServingCents: asNullableNumber(row.cost_per_serving_cents),
      costNoteFr: String(row.cost_note_fr ?? ""),
      costNoteEn: String(row.cost_note_en ?? ""),
      difficulty: String(row.difficulty),
      seasons: parseJson<string[]>(row.seasons, []),
      mealSlots: parseJson<Slot[]>(row.meal_slots, []),
      contains: parseJson(row.contains, {
        pork: false, beef: false, poultry: false, fish: false, shellfish: false, dairy: false, egg: false, honey: false, legume: false,
      }),
      allergens: parseJson<Allergen[]>(row.allergens, []),
      crossContamination: parseJson<Allergen[]>(row.cross_contamination, []),
      allergenDataComplete: asBoolean(row.allergen_data_complete),
      regionName: row.region_name ? String(row.region_name) : null,
      regionDocumented: asBoolean(row.region_documented),
      regionNoteFr: row.region_note_fr ? String(row.region_note_fr) : null,
      regionNoteEn: row.region_note_en ? String(row.region_note_en) : null,
      photoUrl: row.photo_url ? String(row.photo_url) : null,
      photoCredit: row.photo_credit ? String(row.photo_credit) : null,
      photoLicense: row.photo_license ? String(row.photo_license) : null,
      stepsFr: parseJson<string[]>(row.steps_fr, []),
      stepsEn: parseJson<string[]>(row.steps_en, []),
      tags: parseJson<string[]>(row.tags, []),
      status: String(row.status),
      source: String(row.source),
      ingredients: items,
      hasProduce: items.some((item) => item.category === "fruits_legumes"),
    };
  });
  return cache;
}

export async function publishedRecipes(): Promise<StoredRecipe[]> {
  return (await allRecipes()).filter((recipe) => recipe.status === "published");
}

export async function recipeBySlug(slug: string): Promise<StoredRecipe | null> {
  return (await allRecipes()).find((recipe) => recipe.slug === slug) ?? null;
}

export async function recipeById(id: string): Promise<StoredRecipe | null> {
  return (await allRecipes()).find((recipe) => recipe.id === id) ?? null;
}
