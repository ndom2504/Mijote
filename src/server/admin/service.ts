import { asNumber, query } from "@/server/db/client";
import { clearRecipeCache } from "@/server/recipes/repository";
import { scanIngredients } from "@/server/recipes/lexicon";
import type { Allergen, GroceryCategory, Slot } from "@/lib/constants";
import { slugify } from "@/lib/text";

export async function adminStats() {
  const count = async (sql: string) => asNumber((await query<{ count: number }>(sql))[0]?.count);
  return {
    users: await count("SELECT COUNT(*) AS count FROM users"),
    recipes: await count("SELECT COUNT(*) AS count FROM recipes WHERE status = 'published'"),
    plans: await count("SELECT COUNT(*) AS count FROM meal_plans"),
    notifications: await count("SELECT COUNT(*) AS count FROM notifications"),
    aiPending: await count("SELECT COUNT(*) AS count FROM ai_outputs WHERE validated = FALSE"),
    errors: await count("SELECT COUNT(*) AS count FROM app_errors"),
  };
}

export async function listErrors() {
  return query<{ id: string; message: string; context: string | null; created_at: string }>(
    "SELECT id, message, context, created_at FROM app_errors ORDER BY created_at DESC LIMIT 50",
  );
}

export async function listSources() {
  return query("SELECT id, name, kind, url, geographic_zone, updated_on, notes FROM data_sources ORDER BY name");
}

export async function listAiQueue() {
  return query<{ id: string; kind: string; output: string; validated: boolean; rejection_reason: string | null; created_at: string }>(
    "SELECT id, kind, output, validated, rejection_reason, created_at FROM ai_outputs ORDER BY created_at DESC LIMIT 40",
  );
}

export async function markAiReviewed(id: string): Promise<void> {
  await query("UPDATE ai_outputs SET validated = TRUE, rejection_reason = 'reviewed' WHERE id = $1", [id]);
}

export type RecipeWrite = {
  nameFr: string;
  nameEn: string;
  descriptionFr: string;
  descriptionEn: string;
  prepMinutes: number;
  cookMinutes: number;
  servings: number;
  costPerServingCents: number | null;
  difficulty: string;
  seasons: string[];
  mealSlots: Slot[];
  tags: string[];
  status: string;
  allergenDataComplete: boolean;
  extraAllergens: Allergen[];
  crossContamination: Allergen[];
  stepsFr: string[];
  stepsEn: string[];
  ingredients: { nameFr: string; nameEn: string; quantity: number | null; unit: string | null; category: GroceryCategory }[];
};

export async function saveAdminRecipe(input: RecipeWrite, id?: string): Promise<string> {
  const scan = scanIngredients(input.ingredients);
  const allergens = [...new Set([...scan.allergens, ...input.extraAllergens])];
  const now = new Date().toISOString();
  const recipeId = id ?? `recipe-${crypto.randomUUID()}`;
  const slug = id ? (await query<{ slug: string }>("SELECT slug FROM recipes WHERE id = $1", [id]))[0]?.slug ?? slugify(input.nameFr) : slugify(input.nameFr);
  if (id) {
    await query(
      `UPDATE recipes SET name_fr=$2, name_en=$3, description_fr=$4, description_en=$5, prep_minutes=$6, cook_minutes=$7,
        servings=$8, cost_per_serving_cents=$9, cost_estimated_at=$10, cost_source='estimation_interne',
        cost_note_fr=$11, cost_note_en=$12, difficulty=$13, seasons=$14, meal_slots=$15, contains=$16, allergens=$17,
        cross_contamination=$18, allergen_data_complete=$19, steps_fr=$20, steps_en=$21, tags=$22, status=$23, updated_at=$24
       WHERE id=$1`,
      [
        recipeId, input.nameFr, input.nameEn, input.descriptionFr, input.descriptionEn, input.prepMinutes, input.cookMinutes,
        input.servings, input.costPerServingCents, now.slice(0, 10),
        "Estimation interne, à titre indicatif. Ce n'est pas un prix relevé en épicerie.",
        "Internal estimate. This is not a grocery-store price.",
        input.difficulty, JSON.stringify(input.seasons), JSON.stringify(input.mealSlots), JSON.stringify(scan.contains),
        JSON.stringify(allergens), JSON.stringify([...new Set([...scan.crossContamination, ...input.crossContamination])]),
        input.allergenDataComplete, JSON.stringify(input.stepsFr), JSON.stringify(input.stepsEn), JSON.stringify(input.tags),
        input.status, now,
      ],
    );
    await query("DELETE FROM recipe_ingredients WHERE recipe_id = $1", [recipeId]);
  } else {
    await query(
      `INSERT INTO recipes (
        id, slug, name_fr, name_en, description_fr, description_en, prep_minutes, cook_minutes, rest_minutes, servings,
        cost_per_serving_cents, cost_estimated_at, cost_source, cost_note_fr, cost_note_en, difficulty, seasons, meal_slots,
        contains, allergens, cross_contamination, allergen_data_complete, region_documented, photo_credit, photo_license,
        steps_fr, steps_en, tags, status, source, created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,0,$9,$10,$11,'estimation_interne',$12,$13,$14,$15,$16,$17,$18,$19,$20,FALSE,'','',$21,$22,$23,$24,'admin',$25,$25
      )`,
      [
        recipeId, `${slug}-${recipeId.slice(-6)}`, input.nameFr, input.nameEn, input.descriptionFr, input.descriptionEn,
        input.prepMinutes, input.cookMinutes, input.servings, input.costPerServingCents, now.slice(0, 10),
        "Estimation interne, à titre indicatif. Ce n'est pas un prix relevé en épicerie.",
        "Internal estimate. This is not a grocery-store price.",
        input.difficulty, JSON.stringify(input.seasons), JSON.stringify(input.mealSlots), JSON.stringify(scan.contains),
        JSON.stringify(allergens), JSON.stringify([...new Set([...scan.crossContamination, ...input.crossContamination])]),
        input.allergenDataComplete, JSON.stringify(input.stepsFr), JSON.stringify(input.stepsEn), JSON.stringify(input.tags),
        input.status, now,
      ],
    );
  }
  for (const [index, item] of input.ingredients.entries()) {
    await query(
      `INSERT INTO recipe_ingredients (id, recipe_id, name_fr, name_en, quantity, unit, category, scalable, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [crypto.randomUUID(), recipeId, item.nameFr, item.nameEn, item.quantity, item.unit, item.category, item.quantity != null, index],
    );
  }
  clearRecipeCache();
  return recipeId;
}
