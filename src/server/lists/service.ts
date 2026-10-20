import type { Locale } from "@/lib/constants";
import { normalizeText } from "@/lib/text";
import { asBoolean, asNullableNumber, asNumber, one, query } from "@/server/db/client";
import { presentRecipe } from "@/server/menus/service";
import { recipeById } from "@/server/recipes/repository";

export const MAX_LISTS = 50;
export const MAX_ITEMS = 300;

export type ListSummary = { id: string; name: string; itemCount: number; checkedCount: number; updatedAt: string };
export type ListItem = { id: string; name: string; quantity: number | null; unit: string | null; checked: boolean; fromRecipe: boolean };
export type ListDetail = { id: string; name: string; updatedAt: string; items: ListItem[] };

export type ListError = "invalid_name" | "name_taken" | "limit" | "not_found";
type Result<T> = ({ ok: true } & T) | { ok: false; error: ListError };

const now = () => new Date().toISOString();

function cleanName(value: string, max: number): string {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

/* ------------------------------ Recettes sauvegardées ------------------------------ */

export async function setSaved(userId: string, recipeId: string, saved: boolean): Promise<boolean> {
  if (!(await recipeById(recipeId))) return false;
  if (saved) {
    await query(
      "INSERT INTO saved_recipes (user_id, recipe_id, created_at) VALUES ($1,$2,$3) ON CONFLICT (user_id, recipe_id) DO NOTHING",
      [userId, recipeId, now()],
    );
  } else {
    await query("DELETE FROM saved_recipes WHERE user_id = $1 AND recipe_id = $2", [userId, recipeId]);
  }
  return true;
}

export async function listSaved(userId: string, locale: Locale) {
  const rows = await query<{ recipe_id: string }>("SELECT recipe_id FROM saved_recipes WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
  const recipes: ReturnType<typeof presentRecipe>[] = [];
  for (const row of rows) {
    const recipe = await recipeById(row.recipe_id);
    if (recipe) recipes.push(presentRecipe(recipe, locale));
  }
  return recipes;
}

/* ------------------------------ Listes d'épicerie ------------------------------ */

async function ownedList(userId: string, listId: string): Promise<{ id: string; name: string; updated_at: string } | null> {
  return one<{ id: string; name: string; updated_at: string }>("SELECT id, name, updated_at FROM shopping_lists WHERE id = $1 AND user_id = $2", [listId, userId]);
}

async function ownedItem(userId: string, itemId: string): Promise<{ id: string; list_id: string } | null> {
  return one<{ id: string; list_id: string }>(
    "SELECT i.id, i.list_id FROM shopping_list_items i JOIN shopping_lists l ON l.id = i.list_id WHERE i.id = $1 AND l.user_id = $2",
    [itemId, userId],
  );
}

async function touch(listId: string): Promise<void> {
  await query("UPDATE shopping_lists SET updated_at = $2 WHERE id = $1", [listId, now()]);
}

export async function listsOverview(userId: string): Promise<ListSummary[]> {
  const rows = await query<Record<string, unknown>>(
    `SELECT l.id, l.name, l.updated_at,
            COUNT(i.id) AS item_count,
            COALESCE(SUM(CASE WHEN i.checked THEN 1 ELSE 0 END), 0) AS checked_count
       FROM shopping_lists l LEFT JOIN shopping_list_items i ON i.list_id = l.id
      WHERE l.user_id = $1
      GROUP BY l.id, l.name, l.updated_at
      ORDER BY l.updated_at DESC`,
    [userId],
  );
  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    itemCount: asNumber(row.item_count),
    checkedCount: asNumber(row.checked_count),
    updatedAt: String(row.updated_at),
  }));
}

export async function getList(userId: string, listId: string): Promise<ListDetail | null> {
  const list = await ownedList(userId, listId);
  if (!list) return null;
  const rows = await query<Record<string, unknown>>("SELECT * FROM shopping_list_items WHERE list_id = $1 ORDER BY checked, created_at, name", [listId]);
  return {
    id: list.id,
    name: list.name,
    updatedAt: list.updated_at,
    items: rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      quantity: asNullableNumber(row.quantity),
      unit: row.unit ? String(row.unit) : null,
      checked: asBoolean(row.checked),
      fromRecipe: Boolean(row.source_recipe_id),
    })),
  };
}

async function nameTaken(userId: string, name: string, exceptId?: string): Promise<boolean> {
  const rows = await query<{ id: string; name: string }>("SELECT id, name FROM shopping_lists WHERE user_id = $1", [userId]);
  const wanted = normalizeText(name);
  return rows.some((row) => row.id !== exceptId && normalizeText(row.name) === wanted);
}

export async function createList(userId: string, rawName: string): Promise<Result<{ id: string }>> {
  const name = cleanName(rawName, 60);
  if (name.length < 1) return { ok: false, error: "invalid_name" };
  const count = await one<{ n: number }>("SELECT COUNT(*) AS n FROM shopping_lists WHERE user_id = $1", [userId]);
  if (asNumber(count?.n) >= MAX_LISTS) return { ok: false, error: "limit" };
  if (await nameTaken(userId, name)) return { ok: false, error: "name_taken" };
  const id = crypto.randomUUID();
  const stamp = now();
  await query("INSERT INTO shopping_lists (id, user_id, name, created_at, updated_at) VALUES ($1,$2,$3,$4,$4)", [id, userId, name, stamp]);
  return { ok: true, id };
}

export async function renameList(userId: string, listId: string, rawName: string): Promise<Result<object>> {
  const name = cleanName(rawName, 60);
  if (name.length < 1) return { ok: false, error: "invalid_name" };
  if (!(await ownedList(userId, listId))) return { ok: false, error: "not_found" };
  if (await nameTaken(userId, name, listId)) return { ok: false, error: "name_taken" };
  await query("UPDATE shopping_lists SET name = $2, updated_at = $3 WHERE id = $1", [listId, name, now()]);
  return { ok: true };
}

export async function deleteList(userId: string, listId: string): Promise<boolean> {
  if (!(await ownedList(userId, listId))) return false;
  await query("DELETE FROM shopping_lists WHERE id = $1", [listId]);
  return true;
}

async function itemCount(listId: string): Promise<number> {
  const row = await one<{ n: number }>("SELECT COUNT(*) AS n FROM shopping_list_items WHERE list_id = $1", [listId]);
  return asNumber(row?.n);
}

export async function addItem(
  userId: string,
  listId: string,
  input: { name: string; quantity: number | null; unit: string | null },
): Promise<Result<object>> {
  const name = cleanName(input.name, 80);
  if (name.length < 2) return { ok: false, error: "invalid_name" };
  if (!(await ownedList(userId, listId))) return { ok: false, error: "not_found" };
  if ((await itemCount(listId)) >= MAX_ITEMS) return { ok: false, error: "limit" };
  await query(
    "INSERT INTO shopping_list_items (id, list_id, name, quantity, unit, checked, created_at) VALUES ($1,$2,$3,$4,$5,FALSE,$6)",
    [crypto.randomUUID(), listId, name, input.quantity, input.unit, now()],
  );
  await touch(listId);
  return { ok: true };
}

/** Ajoute les ingrédients d'une recette (mis à l'échelle des portions voulues) ; fusionne avec un article identique non coché. */
export async function addRecipeToList(
  userId: string,
  listId: string,
  recipeId: string,
  servings?: number,
): Promise<Result<{ added: number; merged: number }>> {
  if (!(await ownedList(userId, listId))) return { ok: false, error: "not_found" };
  const recipe = await recipeById(recipeId);
  if (!recipe) return { ok: false, error: "not_found" };
  const factor = servings && servings > 0 ? servings / recipe.servings : 1;
  const existing = await query<Record<string, unknown>>("SELECT * FROM shopping_list_items WHERE list_id = $1", [listId]);
  let total = existing.length;
  let added = 0;
  let merged = 0;
  for (const ingredient of recipe.ingredients) {
    const quantity = ingredient.quantity == null ? null : ingredient.scalable ? Math.round(ingredient.quantity * factor * 100) / 100 : ingredient.quantity;
    const key = normalizeText(ingredient.nameFr);
    const twin = existing.find(
      (row) => !asBoolean(row.checked) && normalizeText(String(row.name)) === key && (row.unit ? String(row.unit) : null) === ingredient.unit,
    );
    if (twin && quantity != null && asNullableNumber(twin.quantity) != null) {
      const sum = Math.round(((asNullableNumber(twin.quantity) ?? 0) + quantity) * 100) / 100;
      await query("UPDATE shopping_list_items SET quantity = $2 WHERE id = $1", [String(twin.id), sum]);
      twin.quantity = sum;
      merged += 1;
      continue;
    }
    if (total >= MAX_ITEMS) return { ok: false, error: "limit" };
    const id = crypto.randomUUID();
    await query(
      "INSERT INTO shopping_list_items (id, list_id, name, quantity, unit, checked, source_recipe_id, created_at) VALUES ($1,$2,$3,$4,$5,FALSE,$6,$7)",
      [id, listId, ingredient.nameFr.slice(0, 80), quantity, ingredient.unit, recipeId, now()],
    );
    existing.push({ id, name: ingredient.nameFr, quantity, unit: ingredient.unit, checked: false });
    total += 1;
    added += 1;
  }
  await touch(listId);
  return { ok: true, added, merged };
}

export async function setItemChecked(userId: string, itemId: string, checked: boolean): Promise<boolean> {
  const item = await ownedItem(userId, itemId);
  if (!item) return false;
  await query("UPDATE shopping_list_items SET checked = $2 WHERE id = $1", [itemId, checked]);
  await touch(item.list_id);
  return true;
}

export async function deleteItem(userId: string, itemId: string): Promise<boolean> {
  const item = await ownedItem(userId, itemId);
  if (!item) return false;
  await query("DELETE FROM shopping_list_items WHERE id = $1", [itemId]);
  await touch(item.list_id);
  return true;
}

export async function clearChecked(userId: string, listId: string): Promise<boolean> {
  if (!(await ownedList(userId, listId))) return false;
  await query("DELETE FROM shopping_list_items WHERE list_id = $1 AND checked = TRUE", [listId]);
  await touch(listId);
  return true;
}
