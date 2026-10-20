import { z } from "zod";
import { fail, json, readJson, api } from "@/server/http";
import { listSaved, setSaved } from "@/server/lists/service";
import { mobileRecipe } from "@/server/mobile/recipe";
import { getProfile } from "@/server/profile/service";

export const GET = api(async (_request, user) => {
  if (!user) return fail("unauthenticated", 401);
  const profile = await getProfile(user.id);
  if (!profile) return fail("not_found", 404);
  return json({ recipes: (await listSaved(user.id, profile.locale)).map(mobileRecipe) });
}, { auth: true });

export const POST = api(async (request, user) => {
  if (!user) return fail("unauthenticated", 401);
  const parsed = z.object({ recipeId: z.string().min(3).max(120), saved: z.boolean() }).safeParse(await readJson(request));
  if (!parsed.success) return fail("invalid", 400);
  const ok = await setSaved(user.id, parsed.data.recipeId, parsed.data.saved);
  return ok ? json({ ok: true }) : fail("not_found", 404);
}, { auth: true });
