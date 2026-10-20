import { z } from "zod";
import { fail, json, readJson, api } from "@/server/http";
import { explainWithOptionalAi, queueVariant, substitutionsFor } from "@/server/ai/service";
import { aiConfigured } from "@/server/ai/provider";
import { recipeById } from "@/server/recipes/repository";
import { getProfile } from "@/server/profile/service";

export const GET = api(async () => json({ configured: aiConfigured() }));

export const POST = api(async (request, user) => {
  if (!user) return fail("unauthenticated", 401);
  const body = z.object({ action: z.enum(["explain", "substitute", "variant"]), recipeId: z.string() }).safeParse(await readJson(request));
  if (!body.success) return fail("invalid", 400);
  const recipe = await recipeById(body.data.recipeId);
  const profile = await getProfile(user.id);
  if (!recipe || !profile) return fail("not_found", 404);
  if (body.data.action === "variant") return json(await queueVariant(user.id, recipe.id));
  if (body.data.action === "substitute") return json(await substitutionsFor(user.id, recipe.id, true));
  const base = {
    fr: ["Cette explication repose sur vos préférences, votre temps et votre budget. Elle ne mesure pas la qualité nutritionnelle."],
    en: ["This explanation is based on your preferences, time and budget. It is not a nutrition score."],
  };
  return json(await explainWithOptionalAi(user.id, recipe.id, base));
}, { auth: true });
