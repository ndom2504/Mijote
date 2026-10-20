import { z } from "zod";
import { ALLERGENS, GROCERY_CATEGORIES, SLOTS } from "@/lib/constants";
import { fail, json, readJson, api } from "@/server/http";
import { adminStats, listAiQueue, listErrors, listSources, markAiReviewed, saveAdminRecipe } from "@/server/admin/service";
import { allRecipes } from "@/server/recipes/repository";

export const GET = api(async (request) => {
  const view = new URL(request.url).searchParams.get("view");
  if (view === "recipes") return json({ recipes: await allRecipes() });
  if (view === "errors") return json({ errors: await listErrors() });
  if (view === "sources") return json({ sources: await listSources() });
  if (view === "ai") return json({ items: await listAiQueue() });
  return json({ stats: await adminStats() });
}, { admin: true });

const ingredient = z.object({
  nameFr: z.string().trim().min(2).max(80),
  nameEn: z.string().trim().max(80).default(""),
  quantity: z.number().nullable(),
  unit: z.string().max(20).nullable(),
  category: z.enum(GROCERY_CATEGORIES),
});

export const POST = api(async (request) => {
  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (body?.action === "review") {
    const id = z.string().uuid().safeParse(body.id);
    if (!id.success) return fail("invalid", 400);
    await markAiReviewed(id.data);
    return json({ ok: true });
  }
  const parsed = z.object({
    id: z.string().optional(),
    nameFr: z.string().trim().min(3).max(120),
    nameEn: z.string().trim().max(120).default(""),
    descriptionFr: z.string().trim().min(10).max(800),
    descriptionEn: z.string().trim().max(800).default(""),
    prepMinutes: z.number().int().min(0).max(240),
    cookMinutes: z.number().int().min(0).max(240),
    servings: z.number().int().min(1).max(12),
    costPerServingCents: z.number().int().min(0).max(10000).nullable(),
    difficulty: z.enum(["facile", "moyen"]),
    seasons: z.array(z.string()).max(5),
    mealSlots: z.array(z.enum(SLOTS)).min(1),
    tags: z.array(z.string().max(30)).max(12),
    status: z.enum(["published", "draft", "ai_pending"]),
    allergenDataComplete: z.boolean(),
    extraAllergens: z.array(z.enum(ALLERGENS)).default([]),
    crossContamination: z.array(z.enum(ALLERGENS)).default([]),
    stepsFr: z.array(z.string().trim().min(3)).min(1),
    stepsEn: z.array(z.string()).default([]),
    ingredients: z.array(ingredient).min(1),
  }).safeParse(body);
  if (!parsed.success) return fail("invalid", 400);
  const id = await saveAdminRecipe(parsed.data, parsed.data.id);
  return json({ id });
}, { admin: true });
