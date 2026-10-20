import { z } from "zod";
import { fail, json, readJson, api } from "@/server/http";
import { ensurePlans, replaceMeal, setFavorite, setReaction, setServings } from "@/server/menus/service";
import { addDays, todayInQuebec, weekStartMonday } from "@/lib/date";
import { rebuildGrocery } from "@/server/grocery/service";

export const POST = api(async (request, user) => {
  if (!user) return fail("unauthenticated", 401);
  const body = (await readJson(request)) as Record<string, unknown> | null;
  const action = body?.action;
  if (action === "regenerate-today") {
    await ensurePlans(user.id, [todayInQuebec()], true);
    return json({ ok: true });
  }
  if (action === "regenerate-week") {
    const start = weekStartMonday(todayInQuebec());
    await ensurePlans(user.id, Array.from({ length: 7 }, (_, index) => addDays(start, index)), true);
    return json({ ok: true });
  }
  if (action === "replace") {
    const id = z.string().uuid().safeParse(body?.planId);
    if (!id.success) return fail("invalid", 400);
    const ok = await replaceMeal(user.id, id.data);
    return ok ? json({ ok: true }) : fail("not_found", 404);
  }
  if (action === "reaction") {
    const parsed = z.object({ planId: z.string().uuid(), reaction: z.enum(["like", "dislike"]).nullable() }).safeParse(body);
    if (!parsed.success) return fail("invalid", 400);
    const ok = await setReaction(user.id, parsed.data.planId, parsed.data.reaction);
    return ok ? json({ ok: true }) : fail("not_found", 404);
  }
  if (action === "favorite") {
    const parsed = z.object({ recipeId: z.string().min(3), favorite: z.boolean() }).safeParse(body);
    if (!parsed.success) return fail("invalid", 400);
    const ok = await setFavorite(user.id, parsed.data.recipeId, parsed.data.favorite);
    return ok ? json({ ok: true }) : fail("not_found", 404);
  }
  if (action === "servings") {
    const parsed = z.object({ planId: z.string().uuid(), servings: z.number().int().min(1).max(12) }).safeParse(body);
    if (!parsed.success) return fail("invalid", 400);
    const ok = await setServings(user.id, parsed.data.planId, parsed.data.servings);
    if (!ok) return fail("not_found", 404);
    await rebuildGrocery(user.id, todayInQuebec(), true);
    return json({ ok: true });
  }
  return fail("not_found", 404);
}, { auth: true });
