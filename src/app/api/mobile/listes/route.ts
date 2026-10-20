import { z } from "zod";
import { fail, json, readJson, api } from "@/server/http";
import {
  addItem,
  addRecipeToList,
  clearChecked,
  createList,
  deleteItem,
  deleteList,
  getList,
  listsOverview,
  renameList,
  setItemChecked,
  type ListError,
} from "@/server/lists/service";

const ERROR_STATUS: Record<ListError, number> = { invalid_name: 400, name_taken: 409, limit: 409, not_found: 404 };

const uuid = z.string().uuid();

export const GET = api(async (request, user) => {
  if (!user) return fail("unauthenticated", 401);
  const id = new URL(request.url).searchParams.get("id");
  if (id === null) return json({ lists: await listsOverview(user.id) });
  if (!uuid.safeParse(id).success) return fail("invalid", 400);
  const list = await getList(user.id, id);
  return list ? json({ list }) : fail("not_found", 404);
}, { auth: true });

export const POST = api(async (request, user) => {
  if (!user) return fail("unauthenticated", 401);
  const body = (await readJson(request)) as Record<string, unknown> | null;
  const action = body?.action;

  if (action === "create") {
    const parsed = z.object({ name: z.string().max(200) }).safeParse(body);
    if (!parsed.success) return fail("invalid", 400);
    const result = await createList(user.id, parsed.data.name);
    return result.ok ? json({ ok: true, id: result.id }) : fail(result.error, ERROR_STATUS[result.error]);
  }
  if (action === "rename") {
    const parsed = z.object({ id: uuid, name: z.string().max(200) }).safeParse(body);
    if (!parsed.success) return fail("invalid", 400);
    const result = await renameList(user.id, parsed.data.id, parsed.data.name);
    return result.ok ? json({ ok: true }) : fail(result.error, ERROR_STATUS[result.error]);
  }
  if (action === "delete") {
    const parsed = z.object({ id: uuid }).safeParse(body);
    if (!parsed.success) return fail("invalid", 400);
    return (await deleteList(user.id, parsed.data.id)) ? json({ ok: true }) : fail("not_found", 404);
  }
  if (action === "addItem") {
    const parsed = z.object({
      listId: uuid,
      name: z.string().max(200),
      quantity: z.number().positive().max(100000).nullable().default(null),
      unit: z.string().trim().max(20).nullable().default(null),
    }).safeParse(body);
    if (!parsed.success) return fail("invalid", 400);
    const result = await addItem(user.id, parsed.data.listId, parsed.data);
    return result.ok ? json({ ok: true }) : fail(result.error, ERROR_STATUS[result.error]);
  }
  if (action === "addRecipe") {
    const parsed = z.object({ listId: uuid, recipeId: z.string().min(3).max(120), servings: z.number().int().min(1).max(24).optional() }).safeParse(body);
    if (!parsed.success) return fail("invalid", 400);
    const result = await addRecipeToList(user.id, parsed.data.listId, parsed.data.recipeId, parsed.data.servings);
    return result.ok ? json({ ok: true, added: result.added, merged: result.merged }) : fail(result.error, ERROR_STATUS[result.error]);
  }
  if (action === "check") {
    const parsed = z.object({ itemId: uuid, checked: z.boolean() }).safeParse(body);
    if (!parsed.success) return fail("invalid", 400);
    return (await setItemChecked(user.id, parsed.data.itemId, parsed.data.checked)) ? json({ ok: true }) : fail("not_found", 404);
  }
  if (action === "deleteItem") {
    const parsed = z.object({ itemId: uuid }).safeParse(body);
    if (!parsed.success) return fail("invalid", 400);
    return (await deleteItem(user.id, parsed.data.itemId)) ? json({ ok: true }) : fail("not_found", 404);
  }
  if (action === "clearChecked") {
    const parsed = z.object({ listId: uuid }).safeParse(body);
    if (!parsed.success) return fail("invalid", 400);
    return (await clearChecked(user.id, parsed.data.listId)) ? json({ ok: true }) : fail("not_found", 404);
  }
  return fail("not_found", 404);
}, { auth: true });
