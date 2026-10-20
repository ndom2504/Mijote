import { z } from "zod";
import { countryByCode } from "@/lib/countries";
import { fail, json, api } from "@/server/http";
import { engineProfile, presentRecipe } from "@/server/menus/service";
import { mobileRecipe } from "@/server/mobile/recipe";
import { getProfile } from "@/server/profile/service";
import { originOf } from "@/server/recipes/origins";
import { publishedRecipes, toEngineRecipe } from "@/server/recipes/repository";
import { eligibleForDaily, mealSlotForHour, pickDaily } from "@/server/recommendations/daily";

export const GET = api(async (request, user) => {
  if (!user) return fail("unauthenticated", 401);
  const url = new URL(request.url);
  const parsed = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    hour: z.coerce.number().int().min(0).max(23),
    slot: z.enum(["breakfast", "lunch", "dinner"]).optional(),
  }).safeParse({
    date: url.searchParams.get("date"),
    hour: url.searchParams.get("hour"),
    slot: url.searchParams.get("slot") ?? undefined,
  });
  if (!parsed.success) return fail("invalid", 400);
  const profile = await getProfile(user.id);
  if (!profile) return fail("not_found", 404);
  if (!profile.countryChosen) return fail("country_required", 409);
  const en = profile.locale === "en";
  // Le client peut imposer le repas selon les plages horaires configurées pour son pays ; sinon l'heure décide.
  const slot = parsed.data.slot ?? mealSlotForHour(parsed.data.hour);
  const recipes = await publishedRecipes();
  // Allergies, contamination croisée, ingrédients exclus et régime : toujours respectés. Temps souhaité : respecté si possible.
  const eligibility = eligibleForDaily(recipes.map(toEngineRecipe), engineProfile(profile), slot);
  const picked = pickDaily(
    recipes
      .filter((recipe) => eligibility.ids.has(recipe.id))
      .map((recipe) => ({
        id: recipe.id,
        slug: recipe.slug,
        mealSlots: recipe.mealSlots,
        allergens: recipe.allergens,
        crossContamination: recipe.crossContamination,
        origin: originOf(recipe.slug),
      })),
    {
      country: profile.countryCode,
      slot,
      date: parsed.data.date,
      userId: user.id,
      allergens: profile.allergens,
    },
  );
  if (!picked) {
    return json({
      slot,
      date: parsed.data.date,
      country: countryByCode(profile.countryCode),
      match: null,
      notice: en
        ? "No catalog recipe fits this meal, your allergies and your preferences."
        : "Aucune recette du catalogue ne convient à ce repas, à tes allergies et à tes préférences.",
      recipe: null,
    });
  }
  const stored = recipes.find((recipe) => recipe.id === picked.recipe.id);
  if (!stored) return fail("not_found", 404);
  const view = presentRecipe(stored, profile.locale);
  const country = countryByCode(profile.countryCode);
  const origin = countryByCode(picked.recipe.origin);
  const base = picked.match === "locale"
    ? (en
      ? `Documented for your country in this catalog (${country?.name ?? "—"}). This is not a live local trend.`
      : `Cuisine documentée pour ton pays dans ce catalogue (${country?.name ?? "—"}). Ce n'est pas une tendance locale en temps réel.`)
    : (en
      ? "No catalog recipe for this meal is documented for your country. Here is a recipe from another cuisine."
      : "Aucune recette de ce repas n'est documentée pour ton pays dans le catalogue. Voici une recette d'une autre cuisine.");
  const timeNote = eligibility.relaxedTime
    ? (en
      ? ` No recipe fits your ${profile.cookingTimeMinutes}-minute preference: this one takes longer.`
      : ` Aucune recette ne tient dans tes ${profile.cookingTimeMinutes} minutes souhaitées : celle-ci demande plus de temps.`)
    : "";
  return json({
    slot,
    date: parsed.data.date,
    country,
    match: picked.match,
    origin,
    notice: base + timeNote,
    recipe: mobileRecipe(view),
  });
}, { auth: true });
