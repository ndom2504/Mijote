import type { GroceryCategory, Locale } from "@/lib/constants";
import { GROCERY_CATEGORIES } from "@/lib/constants";
import { weekStartMonday } from "@/lib/date";
import { asBoolean, asNullableNumber, asNumber, one, query } from "@/server/db/client";
import { aggregateGroceries, type GroceryInput } from "@/server/grocery/aggregate";
import { recipeById } from "@/server/recipes/repository";

export type GroceryItemView = {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: GroceryCategory;
  checked: boolean;
  custom: boolean;
  mergeNote: string | null;
};

async function listId(userId: string, weekStart: string): Promise<string> {
  const existing = await one<{ id: string }>("SELECT id FROM grocery_lists WHERE user_id = $1 AND week_start = $2", [userId, weekStart]);
  if (existing) return existing.id;
  const id = crypto.randomUUID();
  await query("INSERT INTO grocery_lists (id, user_id, week_start, created_at) VALUES ($1,$2,$3,$4)", [id, userId, weekStart, new Date().toISOString()]);
  return id;
}

export async function rebuildGrocery(userId: string, isoDate: string, resetManual = false): Promise<string> {
  const start = weekStartMonday(isoDate);
  const endDate = new Date(`${start}T12:00:00Z`);
  endDate.setUTCDate(endDate.getUTCDate() + 6);
  const end = endDate.toISOString().slice(0, 10);
  const plans = await query<Record<string, unknown>>(
    "SELECT recipe_id, servings FROM meal_plans WHERE user_id = $1 AND plan_date >= $2 AND plan_date <= $3",
    [userId, start, end],
  );
  const inputs: GroceryInput[] = [];
  for (const plan of plans) {
    const recipe = await recipeById(String(plan.recipe_id));
    if (!recipe) continue;
    for (const item of recipe.ingredients) {
      inputs.push({
        name: item.nameFr,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        scalable: item.scalable,
        recipeServings: recipe.servings,
        targetServings: asNumber(plan.servings, recipe.servings),
        recipeId: recipe.id,
      });
    }
  }
  const lines = aggregateGroceries(inputs);
  const id = await listId(userId, start);
  const existing = await query<Record<string, unknown>>("SELECT * FROM grocery_items WHERE list_id = $1", [id]);
  const previous = new Map(existing.filter((item) => !asBoolean(item.custom) && item.source_key).map((item) => [String(item.source_key), item]));
  await query("DELETE FROM grocery_items WHERE list_id = $1 AND custom = FALSE", [id]);
  for (const [index, line] of lines.entries()) {
    const prior = previous.get(line.sourceKey);
    const manual = Boolean(prior && asBoolean(prior.manual) && !resetManual);
    await query(
      `INSERT INTO grocery_items (id, list_id, name, quantity, unit, category, checked, custom, manual, merge_note, source_key, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,FALSE,$8,$9,$10,$11)`,
      [
        prior ? String(prior.id) : crypto.randomUUID(),
        id,
        line.name,
        manual ? asNullableNumber(prior?.quantity) : line.quantity,
        line.unit,
        line.category,
        prior ? asBoolean(prior.checked) : false,
        manual,
        line.mergeNote,
        line.sourceKey,
        index,
      ],
    );
  }
  return id;
}

export async function groceryList(userId: string, isoDate: string): Promise<{ weekStart: string; items: GroceryItemView[] }> {
  const weekStart = weekStartMonday(isoDate);
  await rebuildGrocery(userId, isoDate, false);
  const id = await listId(userId, weekStart);
  const rows = await query<Record<string, unknown>>("SELECT * FROM grocery_items WHERE list_id = $1 ORDER BY sort_order, name", [id]);
  return {
    weekStart,
    items: rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      quantity: asNullableNumber(row.quantity),
      unit: row.unit ? String(row.unit) : null,
      category: (GROCERY_CATEGORIES.includes(String(row.category) as GroceryCategory) ? String(row.category) : "autres") as GroceryCategory,
      checked: asBoolean(row.checked),
      custom: asBoolean(row.custom),
      mergeNote: row.merge_note ? String(row.merge_note) : null,
    })),
  };
}

async function ownedItem(userId: string, itemId: string) {
  return one<{ id: string }>(
    "SELECT i.id FROM grocery_items i JOIN grocery_lists l ON l.id = i.list_id WHERE i.id = $1 AND l.user_id = $2",
    [itemId, userId],
  );
}

export async function updateGroceryItem(userId: string, itemId: string, patch: { checked?: boolean; quantity?: number | null; name?: string }): Promise<boolean> {
  const item = await ownedItem(userId, itemId);
  if (!item) return false;
  if (patch.checked != null) await query("UPDATE grocery_items SET checked = $2 WHERE id = $1", [itemId, patch.checked]);
  if (patch.quantity !== undefined) await query("UPDATE grocery_items SET quantity = $2, manual = TRUE WHERE id = $1", [itemId, patch.quantity]);
  if (patch.name) await query("UPDATE grocery_items SET name = $2, custom = TRUE WHERE id = $1", [itemId, patch.name.slice(0, 80)]);
  return true;
}

export async function addGroceryItem(userId: string, isoDate: string, input: { name: string; quantity: number | null; unit: string | null; category: GroceryCategory }): Promise<void> {
  const id = await listId(userId, weekStartMonday(isoDate));
  await query(
    `INSERT INTO grocery_items (id, list_id, name, quantity, unit, category, checked, custom, manual, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,FALSE,TRUE,TRUE,1000)`,
    [crypto.randomUUID(), id, input.name.slice(0, 80), input.quantity, input.unit, input.category],
  );
}

export async function deleteGroceryItem(userId: string, itemId: string): Promise<boolean> {
  const item = await ownedItem(userId, itemId);
  if (!item) return false;
  await query("DELETE FROM grocery_items WHERE id = $1", [itemId]);
  return true;
}

export function groceryText(items: GroceryItemView[], title: string, locale: Locale): string {
  const lines = [title, ""];
  for (const category of GROCERY_CATEGORIES) {
    const group = items.filter((item) => item.category === category);
    if (!group.length) continue;
    lines.push(category);
    for (const item of group) {
      const amount = item.quantity == null ? "" : ` — ${item.quantity} ${item.unit ?? ""}`.trimEnd();
      lines.push(`${item.checked ? "[x]" : "[ ]"} ${item.name}${amount}`);
      if (item.mergeNote) lines.push(`    ${item.mergeNote}`);
    }
    lines.push("");
  }
  lines.push(locale === "en"
    ? "Quantities come from the planned recipes. Prices are not included."
    : "Les quantités viennent des recettes planifiées. Les prix ne sont pas inclus.");
  return lines.join("\n");
}
