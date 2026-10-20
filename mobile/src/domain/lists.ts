import { normalizeSearch, quantityLabel } from "../lib/format";
import type { Recipe, ShoppingListItem } from "./types";

export const MAX_LISTS = 50;
export const MAX_ITEMS = 300;
export const LIST_NAME_MAX = 60;

export interface DraftItem {
  name: string;
  quantity: number | null;
  unit: string | null;
}

export function cleanName(raw: string, max = LIST_NAME_MAX): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, max);
}

export function isNameTaken(names: string[], name: string, except?: string): boolean {
  const wanted = normalizeSearch(name);
  return names.some((existing) => existing !== except && normalizeSearch(existing) === wanted);
}

/** Ingrédients d'une recette ramenés au nombre de portions voulu (arrondi au centième). */
export function recipeDrafts(recipe: Pick<Recipe, "ingredients" | "servings">, servings?: number): DraftItem[] {
  const factor = servings && recipe.servings > 0 ? servings / recipe.servings : 1;
  return recipe.ingredients.map((ingredient) => ({
    name: ingredient.name,
    quantity: ingredient.quantity === null ? null : Math.round(ingredient.quantity * factor * 100) / 100,
    unit: ingredient.unit,
  }));
}

/** Ajoute des articles : un article identique (même nom et même unité, pas encore coché) est fusionné. */
export function mergeDrafts(
  items: ShoppingListItem[],
  drafts: DraftItem[],
  makeId: () => string,
  fromRecipe: boolean,
): { items: ShoppingListItem[]; added: number; merged: number } {
  const next = items.map((item) => ({ ...item }));
  let added = 0;
  let merged = 0;
  for (const draft of drafts) {
    const key = normalizeSearch(draft.name);
    const twin = next.find((item) => !item.checked && normalizeSearch(item.name) === key && (item.unit ?? null) === (draft.unit ?? null));
    if (twin && twin.quantity !== null && draft.quantity !== null) {
      twin.quantity = Math.round((twin.quantity + draft.quantity) * 100) / 100;
      merged += 1;
    } else if (next.length < MAX_ITEMS) {
      next.push({ id: makeId(), name: draft.name, quantity: draft.quantity, unit: draft.unit, checked: false, fromRecipe });
      added += 1;
    }
  }
  return { items: next, added, merged };
}

/** Texte de progression d'une liste : « 2 sur 5 »  / « Liste vide ». */
export function progressLabel(itemCount: number, checkedCount: number): string {
  if (itemCount === 0) return "Liste vide";
  if (checkedCount === itemCount) return `${itemCount} ${itemCount > 1 ? "articles cochés" : "article coché"}`;
  return `${checkedCount} sur ${itemCount} cochés`;
}

export function listErrorMessage(code: string): string {
  switch (code) {
    case "invalid_name":
      return "Donne un nom à ta liste.";
    case "name_taken":
      return "Tu as déjà une liste avec ce nom.";
    case "limit":
      return "Tu as atteint le nombre maximal de listes ou d'articles.";
    case "not_found":
      return "Cette liste n'existe plus.";
    default:
      return "L'opération n'a pas fonctionné. Réessaie.";
  }
}

/** Quantité d'un article (« 2 tasses »), ou chaîne vide si l'article n'en a pas. */
export function itemQuantity(item: { quantity: number | null; unit: string | null }): string {
  return quantityLabel(item.quantity, item.unit);
}
