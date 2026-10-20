import { GROCERY_CATEGORIES, type GroceryCategory } from "@/lib/constants";
import { scaleQuantity } from "@/lib/quantity";
import { normalizeText } from "@/lib/text";

export type GroceryInput = {
  name: string;
  quantity: number | null;
  unit: string | null;
  category: GroceryCategory;
  scalable: boolean;
  recipeServings: number;
  targetServings: number;
  recipeId: string;
};

export type GroceryLine = {
  name: string;
  quantity: number | null;
  unit: string | null;
  category: GroceryCategory;
  mergeNote: string | null;
  recipeCount: number;
  sourceKey: string;
};

const UNIT_ALIAS: Record<string, string> = {
  g: "g",
  gramme: "g",
  grammes: "g",
  kg: "g",
  ml: "ml",
  millilitre: "ml",
  millilitres: "ml",
  l: "ml",
  litre: "ml",
  litres: "ml",
  unite: "unite",
  unites: "unite",
  cas: "cas",
  cac: "cac",
  tasse: "tasse",
  tasses: "tasse",
  pincee: "pincee",
  pincees: "pincee",
};

function canonicalUnit(unit: string | null, quantity: number | null): { unit: string | null; quantity: number | null } {
  if (!unit) return { unit: null, quantity };
  const normalized = normalizeText(unit);
  if (normalized === "kg") return { unit: "g", quantity: quantity == null ? null : quantity * 1000 };
  if (normalized === "l" || normalized === "litre" || normalized === "litres") {
    return { unit: "ml", quantity: quantity == null ? null : quantity * 1000 };
  }
  return { unit: UNIT_ALIAS[normalized] ?? normalized, quantity };
}

export function aggregateGroceries(items: GroceryInput[]): GroceryLine[] {
  type Group = {
    name: string;
    category: GroceryCategory;
    units: Map<string, { quantity: number | null; count: number; unspecified: boolean; recipes: Set<string> }>;
  };
  const groups = new Map<string, Group>();

  for (const item of items) {
    const scaled = scaleQuantity(item.quantity, item.recipeServings, item.targetServings, item.scalable && item.quantity != null);
    const unit = canonicalUnit(item.unit, scaled);
    const category = GROCERY_CATEGORIES.includes(item.category) ? item.category : "autres";
    const key = `${normalizeText(item.name)}|${category}`;
    let group = groups.get(key);
    if (!group) {
      group = { name: item.name, category, units: new Map() };
      groups.set(key, group);
    }
    const unitKey = unit.unit ?? "";
    const bucket = group.units.get(unitKey) ?? { quantity: 0, count: 0, unspecified: false, recipes: new Set<string>() };
    bucket.recipes.add(item.recipeId);
    if (unit.quantity == null) {
      bucket.unspecified = true;
      bucket.quantity = null;
    } else if (!bucket.unspecified) {
      bucket.quantity = Math.round(((bucket.quantity ?? 0) + unit.quantity) * 100) / 100;
    }
    bucket.count += 1;
    group.units.set(unitKey, bucket);
  }

  const lines: GroceryLine[] = [];
  for (const group of groups.values()) {
    const mixed = group.units.size > 1;
    for (const [unit, bucket] of group.units) {
      const notes: string[] = [];
      if (mixed) notes.push("Unité différente : non additionnée automatiquement.");
      if (bucket.unspecified) notes.push("Quantité non précisée : non additionnée.");
      if (bucket.recipes.size > 1) notes.push("Présent dans plus d'un repas de la semaine.");
      lines.push({
        name: group.name,
        quantity: bucket.unspecified ? null : bucket.quantity,
        unit: unit || null,
        category: group.category,
        mergeNote: notes.length ? notes.join(" ") : null,
        recipeCount: bucket.recipes.size,
        sourceKey: `${normalizeText(group.name)}|${group.category}|${unit}`,
      });
    }
  }

  return lines.sort((a, b) => {
    const category = GROCERY_CATEGORIES.indexOf(a.category) - GROCERY_CATEGORIES.indexOf(b.category);
    if (category !== 0) return category;
    return a.name.localeCompare(b.name, "fr");
  });
}
