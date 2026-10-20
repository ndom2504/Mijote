import type { Locale, Slot } from "@/lib/constants";
import { SLOTS } from "@/lib/constants";
import { addDays, seasonOf, todayInQuebec, weekStartMonday } from "@/lib/date";
import { asNumber, one, parseJson, query } from "@/server/db/client";
import { getProfile, type ProfileRecord } from "@/server/profile/service";
import { foodMarkers } from "@/server/recipes/markers";
import { publishedRecipes, recipeById, toEngineRecipe, type StoredRecipe } from "@/server/recipes/repository";
import { pickForSlot, proteinKey, varietyReport, type EngineProfile, type EngineRecipe } from "@/server/recommendations/engine";
import type { Explanation } from "@/server/recommendations/engine";

export type MealView = {
  planId: string;
  date: string;
  slot: Slot;
  servings: number;
  reaction: "like" | "dislike" | null;
  favorite: boolean;
  explanation: string[];
  warnings: string[];
  recipe: ReturnType<typeof presentRecipe>;
};

export function engineProfile(profile: ProfileRecord): EngineProfile {
  return {
    diets: profile.diets,
    allergens: profile.allergens,
    excludedIngredients: profile.otherExclusions,
    breakfastPrefs: profile.breakfastPrefs,
    lunchPrefs: profile.lunchPrefs,
    dinnerPrefs: profile.dinnerPrefs,
    cookingTimeMinutes: profile.cookingTimeMinutes,
    weeklyBudgetCents: profile.weeklyBudgetCents,
    householdSize: profile.householdSize,
    region: profile.regionName,
  };
}

export function presentRecipe(recipe: StoredRecipe, locale: Locale, servings = recipe.servings) {
  const steps = locale === "en" ? recipe.stepsEn : recipe.stepsFr;
  return {
    id: recipe.id,
    slug: recipe.slug,
    name: locale === "en" && recipe.nameEn ? recipe.nameEn : recipe.nameFr,
    description: locale === "en" && recipe.descriptionEn ? recipe.descriptionEn : recipe.descriptionFr,
    prepMinutes: recipe.prepMinutes,
    cookMinutes: recipe.cookMinutes,
    restMinutes: recipe.restMinutes,
    baseServings: recipe.servings,
    servings,
    costPerServingCents: recipe.costPerServingCents,
    costNote: locale === "en" ? recipe.costNoteEn : recipe.costNoteFr,
    difficulty: recipe.difficulty,
    photoUrl: recipe.photoUrl,
    photoCredit: recipe.photoCredit,
    photoLicense: recipe.photoLicense,
    allergens: recipe.allergens,
    crossContamination: recipe.crossContamination,
    allergenDataComplete: recipe.allergenDataComplete,
    regionNote: locale === "en" ? recipe.regionNoteEn : recipe.regionNoteFr,
    tags: recipe.tags,
    ingredients: recipe.ingredients.map((item) => ({
      name: locale === "en" && item.nameEn ? item.nameEn : item.nameFr,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      scalable: item.scalable,
    })),
    steps,
    markers: foodMarkers(recipe.contains, recipe.hasProduce, recipe.ingredients.map((item) => item.nameFr), locale),
  };
}

async function favoriteSet(userId: string): Promise<Set<string>> {
  const rows = await query<{ recipe_id: string }>("SELECT recipe_id FROM favorites WHERE user_id = $1", [userId]);
  return new Set(rows.map((row) => row.recipe_id));
}

export async function ensurePlans(userId: string, dates: string[], replace = false): Promise<void> {
  const profile = await getProfile(userId);
  if (!profile || dates.length === 0) return;
  const preferences = engineProfile(profile);
  const recipes = (await publishedRecipes()).map(toEngineRecipe);
  const byId = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const earliest = addDays(dates[0], -14);
  const history = await query<{ recipe_id: string; plan_date: string; reaction: string | null }>(
    "SELECT recipe_id, plan_date, reaction FROM meal_plans WHERE user_id = $1 AND plan_date >= $2",
    [userId, earliest],
  );
  const recentIds = history.filter((row) => row.plan_date >= addDays(dates[0], -7)).map((row) => row.recipe_id);
  const olderIds = history.filter((row) => row.plan_date < addDays(dates[0], -7)).map((row) => row.recipe_id);
  const latestReaction = new Map<string, string>();
  for (const row of [...history].sort((a, b) => a.plan_date.localeCompare(b.plan_date))) {
    if (row.reaction) latestReaction.set(row.recipe_id, row.reaction);
  }
  const favorites = await favoriteSet(userId);
  const likedIds = [...new Set([...favorites, ...[...latestReaction.entries()].filter(([, reaction]) => reaction === "like").map(([id]) => id)])];
  const dislikedIds = [...latestReaction.entries()].filter(([id, reaction]) => reaction === "dislike" && !favorites.has(id)).map(([id]) => id);
  const recentIngredients = recipes.filter((recipe) => recentIds.includes(recipe.id)).flatMap((recipe) => recipe.ingredientNames);

  for (const date of dates) {
    const existing = await query<{ id: string; slot: Slot; recipe_id: string }>(
      "SELECT id, slot, recipe_id FROM meal_plans WHERE user_id = $1 AND plan_date = $2",
      [userId, date],
    );
    const dayProteins: string[] = [];
    const chosen: string[] = [];
    for (const slot of SLOTS) {
      const current = existing.find((row) => row.slot === slot);
      if (current && !replace) {
        chosen.push(current.recipe_id);
        const known = byId.get(current.recipe_id);
        if (known) dayProteins.push(proteinKey(known.contains));
        continue;
      }
      const picked = pickForSlot({
        recipes,
        profile: preferences,
        slot,
        season: seasonOf(date),
        recentIds,
        olderIds,
        likedIds,
        dislikedIds,
        excludeIds: chosen,
        dayProteins,
        recentIngredients,
      });
      if (!picked) {
        if (current && replace) await query("DELETE FROM meal_plans WHERE id = $1 AND user_id = $2", [current.id, userId]);
        continue;
      }
      chosen.push(picked.recipe.id);
      dayProteins.push(proteinKey(picked.recipe.contains));
      recentIds.push(picked.recipe.id);
      const now = new Date().toISOString();
      if (current) {
        await query(
          `UPDATE meal_plans SET recipe_id = $2, servings = $3, reaction = NULL, explanation = $4, warnings = $5, relaxed = $6, created_at = $7 WHERE id = $1 AND user_id = $8`,
          [current.id, picked.recipe.id, profile.householdSize, JSON.stringify(picked.explanation), JSON.stringify(picked.warnings), JSON.stringify(picked.relaxed), now, userId],
        );
      } else {
        await query(
          `INSERT INTO meal_plans (id, user_id, plan_date, slot, recipe_id, servings, explanation, warnings, relaxed, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [crypto.randomUUID(), userId, date, slot, picked.recipe.id, profile.householdSize, JSON.stringify(picked.explanation), JSON.stringify(picked.warnings), JSON.stringify(picked.relaxed), now],
        );
      }
    }
  }
}

export async function ensureToday(userId: string): Promise<void> {
  await ensurePlans(userId, [todayInQuebec()]);
}

export async function ensureWeek(userId: string, isoDate = todayInQuebec()): Promise<string> {
  const start = weekStartMonday(isoDate);
  const dates = Array.from({ length: 7 }, (_, index) => addDays(start, index));
  await ensurePlans(userId, dates);
  return start;
}

export async function readPlans(userId: string, from: string, to: string, locale: Locale): Promise<MealView[]> {
  const rows = await query<Record<string, unknown>>(
    `SELECT * FROM meal_plans WHERE user_id = $1 AND plan_date >= $2 AND plan_date <= $3 ORDER BY plan_date, CASE slot WHEN 'breakfast' THEN 1 WHEN 'lunch' THEN 2 ELSE 3 END`,
    [userId, from, to],
  );
  const favorites = await favoriteSet(userId);
  const meals: MealView[] = [];
  for (const row of rows) {
    const recipe = await recipeById(String(row.recipe_id));
    if (!recipe) continue;
    const explanation = parseJson<Explanation>(row.explanation, { fr: [], en: [] });
    const warnings = parseJson<Explanation>(row.warnings, { fr: [], en: [] });
    meals.push({
      planId: String(row.id),
      date: String(row.plan_date),
      slot: String(row.slot) as Slot,
      servings: asNumber(row.servings, recipe.servings),
      reaction: row.reaction === "like" || row.reaction === "dislike" ? row.reaction : null,
      favorite: favorites.has(recipe.id),
      explanation: locale === "en" ? explanation.en : explanation.fr,
      warnings: locale === "en" ? warnings.en : warnings.fr,
      recipe: presentRecipe(recipe, locale, asNumber(row.servings, recipe.servings)),
    });
  }
  return meals;
}

export async function todayBoard(userId: string, locale: Locale) {
  const today = todayInQuebec();
  await ensureWeek(userId, today);
  const profile = await getProfile(userId);
  const meals = await readPlans(userId, today, today, locale);
  const recipes = (await Promise.all(meals.map(async (meal) => recipeById(meal.recipe.id)))).filter((item): item is StoredRecipe => item != null);
  const engines: EngineRecipe[] = recipes.map(toEngineRecipe);
  const minutes = meals.reduce((sum, meal) => sum + meal.recipe.prepMinutes + meal.recipe.cookMinutes, 0);
  const knownCosts = meals.filter((meal) => meal.recipe.costPerServingCents != null);
  const cost = knownCosts.reduce((sum, meal) => sum + (meal.recipe.costPerServingCents ?? 0) * meal.servings, 0);
  return {
    date: today,
    profile,
    meals,
    minutes,
    costCents: knownCosts.length ? cost : null,
    costPartial: knownCosts.length !== meals.length,
    variety: varietyReport(engines, locale),
  };
}

export async function replaceMeal(userId: string, planId: string): Promise<boolean> {
  const plan = await one<Record<string, unknown>>("SELECT id, plan_date, slot, recipe_id FROM meal_plans WHERE id = $1 AND user_id = $2", [planId, userId]);
  if (!plan) return false;
  const profile = await getProfile(userId);
  if (!profile) return false;
  const date = String(plan.plan_date);
  const slot = String(plan.slot) as Slot;
  const siblings = await query<{ recipe_id: string }>("SELECT recipe_id FROM meal_plans WHERE user_id = $1 AND plan_date = $2 AND id <> $3", [userId, date, planId]);
  const history = await query<{ recipe_id: string; plan_date: string; reaction: string | null }>(
    "SELECT recipe_id, plan_date, reaction FROM meal_plans WHERE user_id = $1 AND plan_date >= $2",
    [userId, addDays(date, -14)],
  );
  const recipes = (await publishedRecipes()).map(toEngineRecipe);
  const favorites = await favoriteSet(userId);
  const likedIds = [...favorites];
  for (const row of history) if (row.reaction === "like") likedIds.push(row.recipe_id);
  const dislikedIds = history.filter((row) => row.reaction === "dislike" && !favorites.has(row.recipe_id)).map((row) => row.recipe_id);
  const picked = pickForSlot({
    recipes,
    profile: engineProfile(profile),
    slot,
    season: seasonOf(date),
    recentIds: history.filter((row) => row.plan_date >= addDays(date, -7)).map((row) => row.recipe_id),
    olderIds: [],
    likedIds,
    dislikedIds,
    excludeIds: [String(plan.recipe_id), ...siblings.map((row) => row.recipe_id)],
    dayProteins: [],
    recentIngredients: [],
  });
  if (!picked) return false;
  await query(
    `UPDATE meal_plans SET recipe_id = $2, servings = $3, reaction = NULL, explanation = $4, warnings = $5, relaxed = $6, created_at = $7 WHERE id = $1 AND user_id = $8`,
    [planId, picked.recipe.id, profile.householdSize, JSON.stringify(picked.explanation), JSON.stringify(picked.warnings), JSON.stringify(picked.relaxed), new Date().toISOString(), userId],
  );
  return true;
}

export async function setReaction(userId: string, planId: string, reaction: "like" | "dislike" | null): Promise<boolean> {
  const result = await query("UPDATE meal_plans SET reaction = $3 WHERE id = $1 AND user_id = $2 RETURNING id", [planId, userId, reaction]);
  return result.length > 0;
}

export async function setFavorite(userId: string, recipeId: string, favorite: boolean): Promise<boolean> {
  const recipe = await recipeById(recipeId);
  if (!recipe) return false;
  if (favorite) {
    await query(
      "INSERT INTO favorites (user_id, recipe_id, created_at) VALUES ($1,$2,$3) ON CONFLICT (user_id, recipe_id) DO NOTHING",
      [userId, recipeId, new Date().toISOString()],
    );
  } else {
    await query("DELETE FROM favorites WHERE user_id = $1 AND recipe_id = $2", [userId, recipeId]);
  }
  return true;
}

export async function listFavorites(userId: string, locale: Locale) {
  const rows = await query<{ recipe_id: string }>("SELECT recipe_id FROM favorites WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
  const recipes: ReturnType<typeof presentRecipe>[] = [];
  for (const row of rows) {
    const recipe = await recipeById(row.recipe_id);
    if (recipe) recipes.push(presentRecipe(recipe, locale));
  }
  return recipes;
}

export async function setServings(userId: string, planId: string, servings: number): Promise<boolean> {
  const result = await query("UPDATE meal_plans SET servings = $3 WHERE id = $1 AND user_id = $2 RETURNING id", [planId, userId, servings]);
  return result.length > 0;
}
