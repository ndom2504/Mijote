import { asNumber, one, query } from "@/server/db/client";
import { aiComplete, aiConfigured } from "@/server/ai/provider";
import { validateExplanation, validateSubstitution, ruleSubstitutions, type Substitution } from "@/server/ai/validate";
import { recipeById } from "@/server/recipes/repository";
import { getProfile } from "@/server/profile/service";

export async function explainWithOptionalAi(userId: string, recipeId: string, base: { fr: string[]; en: string[] }): Promise<{ fr: string[]; en: string[]; ai: boolean }> {
  if (!aiConfigured()) return { ...base, ai: false };
  const recipe = await recipeById(recipeId);
  const profile = await getProfile(userId);
  if (!recipe || !profile) return { ...base, ai: false };
  try {
    const text = await aiComplete(
      "Tu écris en français québécois, en deux phrases, pourquoi une recette déjà filtrée peut convenir au temps, au budget ou aux préférences. N'ajoute aucun ingrédient. Ne promets aucun bénéfice médical. Ne dis jamais qu'une recette est garantie sans allergène.",
      `Recette: ${recipe.nameFr}. Préférences: ${profile.breakfastPrefs.concat(profile.lunchPrefs, profile.dinnerPrefs).join(", ")}. Objectifs: ${profile.goals.join(", ")}.`,
    );
    if (text && validateExplanation(text)) {
      await query(
        `INSERT INTO ai_outputs (id, user_id, kind, output, validated, created_at) VALUES ($1,$2,'explanation',$3,TRUE,$4)`,
        [crypto.randomUUID(), userId, text, new Date().toISOString()],
      );
      return { fr: [...base.fr, text], en: [...base.en, text], ai: true };
    }
    await query(
      `INSERT INTO ai_outputs (id, user_id, kind, output, validated, rejection_reason, created_at) VALUES ($1,$2,'explanation',$3,FALSE,'rejected',$4)`,
      [crypto.randomUUID(), userId, text ?? "", new Date().toISOString()],
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "ai_error";
    await query(
      `INSERT INTO ai_outputs (id, user_id, kind, output, validated, rejection_reason, created_at) VALUES ($1,$2,'explanation','',FALSE,$3,$4)`,
      [crypto.randomUUID(), userId, message.slice(0, 120), new Date().toISOString()],
    );
  }
  return { ...base, ai: false };
}

export async function substitutionsFor(userId: string, recipeId: string, useAi: boolean): Promise<{ items: Substitution[]; ai: boolean }> {
  const recipe = await recipeById(recipeId);
  const profile = await getProfile(userId);
  if (!recipe || !profile) return { items: [], ai: false };
  const rules = ruleSubstitutions(recipe.ingredients.map((item) => item.nameFr), profile.allergens);
  if (!useAi || !aiConfigured()) return { items: rules, ai: false };
  let ai: Substitution[] = [];
  try {
    const text = await aiComplete(
      "Réponds uniquement avec un tableau JSON [{\"ingredient\":\"nom court\",\"replacement\":\"nom court\"}]. Noms d'ingrédients seulement. N'affirme aucune garantie allergène.",
      `Ingrédients: ${recipe.ingredients.map((item) => item.nameFr).join(", ")}. Allergies à ne pas introduire: ${profile.allergens.join(", ")}.`,
    );
    const match = text?.match(/\[[\s\S]*\]/);
    const parsed = match ? JSON.parse(match[0]) as { ingredient?: string; replacement?: string }[] : [];
    for (const item of parsed) {
      if (!item.replacement || !item.ingredient) continue;
      const check = validateSubstitution(item.replacement, profile.allergens);
      if (!check.ok) continue;
      ai.push({
        ingredient: item.ingredient,
        replacement: item.replacement,
        noteFr: "Suggestion vérifiée par le lexique d'allergènes de Mijoté, pas une certification.",
        noteEn: "Checked against Mijoté's allergen lexicon, not a certification.",
        source: "ai",
      });
    }
    await query(
      `INSERT INTO ai_outputs (id, user_id, kind, output, validated, created_at) VALUES ($1,$2,'substitution',$3,$4,$5)`,
      [crypto.randomUUID(), userId, JSON.stringify(ai), ai.length > 0, new Date().toISOString()],
    );
  } catch {
    ai = [];
  }
  return { items: [...rules, ...ai], ai: ai.length > 0 };
}

export async function queueVariant(userId: string, recipeId: string): Promise<{ queued: boolean; ai: boolean }> {
  if (!aiConfigured()) return { queued: false, ai: false };
  const recipe = await recipeById(recipeId);
  if (!recipe) return { queued: false, ai: false };
  const text = await aiComplete(
    "Propose une variante courte en français. Ne garantis rien sur les allergènes. Le texte sera relu par un administrateur avant toute publication.",
    recipe.nameFr,
  );
  if (!text) return { queued: false, ai: true };
  await query(
    `INSERT INTO ai_outputs (id, user_id, kind, output, validated, rejection_reason, created_at) VALUES ($1,$2,'variant',$3,FALSE,'pending_review',$4)`,
    [crypto.randomUUID(), userId, text.slice(0, 2000), new Date().toISOString()],
  );
  return { queued: true, ai: true };
}

export async function aiStatus(): Promise<{ configured: boolean }> {
  return { configured: aiConfigured() };
}

export async function countPendingAi(): Promise<number> {
  const row = await one<{ count: number }>("SELECT COUNT(*) AS count FROM ai_outputs WHERE validated = FALSE");
  return asNumber(row?.count);
}
