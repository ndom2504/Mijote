import { z } from "zod";
import { GROCERY_CATEGORIES } from "@/lib/constants";
import { todayInQuebec } from "@/lib/date";
import { fail, json, readJson, api } from "@/server/http";
import { addGroceryItem, deleteGroceryItem, groceryList, groceryText, rebuildGrocery, updateGroceryItem } from "@/server/grocery/service";
import { groceryPdf } from "@/server/grocery/pdf";
import { getProfile } from "@/server/profile/service";

export const GET = api(async (request, user) => {
  if (!user) return fail("unauthenticated", 401);
  const format = new URL(request.url).searchParams.get("format");
  const profile = await getProfile(user.id);
  const locale = profile?.locale ?? "fr";
  const list = await groceryList(user.id, todayInQuebec());
  if (format === "pdf") {
    const bytes = await groceryPdf(
      locale === "en" ? `Mijote grocery list — week of ${list.weekStart}` : `Mijoté — liste d'épicerie, semaine du ${list.weekStart}`,
      list.items,
      locale === "en" ? "Quantities come from planned recipes. Prices are not included." : "Les quantités viennent des recettes planifiées. Les prix ne sont pas inclus.",
    );
    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=mijote-epicerie.pdf",
      },
    });
  }
  return json({ text: groceryText(list.items, locale === "en" ? "Mijote grocery list" : "Mijoté — liste d'épicerie", locale) });
}, { auth: true });

export const POST = api(async (request, user) => {
  if (!user) return fail("unauthenticated", 401);
  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (body?.action === "add") {
    const parsed = z.object({
      name: z.string().trim().min(2).max(80),
      quantity: z.number().nullable(),
      unit: z.string().max(20).nullable(),
      category: z.enum(GROCERY_CATEGORIES),
    }).safeParse(body);
    if (!parsed.success) return fail("invalid", 400);
    await addGroceryItem(user.id, todayInQuebec(), parsed.data);
    return json({ ok: true });
  }
  if (body?.action === "update") {
    const parsed = z.object({
      id: z.string().uuid(),
      checked: z.boolean().optional(),
      quantity: z.number().nullable().optional(),
    }).safeParse(body);
    if (!parsed.success) return fail("invalid", 400);
    const ok = await updateGroceryItem(user.id, parsed.data.id, parsed.data);
    return ok ? json({ ok: true }) : fail("not_found", 404);
  }
  if (body?.action === "delete") {
    const id = z.string().uuid().safeParse(body.id);
    if (!id.success) return fail("invalid", 400);
    const ok = await deleteGroceryItem(user.id, id.data);
    return ok ? json({ ok: true }) : fail("not_found", 404);
  }
  if (body?.action === "rebuild") {
    await rebuildGrocery(user.id, todayInQuebec(), true);
    return json({ ok: true });
  }
  return fail("not_found", 404);
}, { auth: true });
