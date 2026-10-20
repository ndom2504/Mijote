import { describe, expect, it } from "vitest";
import { cleanName, isNameTaken, itemQuantity, mergeDrafts, MAX_ITEMS, progressLabel, recipeDrafts } from "./lists";
import { groupByOrigin, searchRecipes, visibleCatalog } from "./catalog";
import type { Recipe, ShoppingListItem } from "./types";

const item = (patch: Partial<ShoppingListItem>): ShoppingListItem => ({ id: "x", name: "Lait", quantity: 1, unit: "tasse", checked: false, fromRecipe: false, ...patch });

describe("listes d'épicerie", () => {
  it("nettoie et compare les noms sans accent ni casse", () => {
    expect(cleanName("  Marché   du   samedi ")).toBe("Marché du samedi");
    expect(isNameTaken(["Marché"], "marche")).toBe(true);
    expect(isNameTaken(["Marché"], "Marché", "Marché")).toBe(false);
  });

  it("ramène les ingrédients au nombre de portions voulu", () => {
    const drafts = recipeDrafts({ servings: 2, ingredients: [{ name: "Riz", quantity: 1, unit: "tasse" }, { name: "Sel", quantity: null, unit: null }] }, 5);
    expect(drafts).toEqual([
      { name: "Riz", quantity: 2.5, unit: "tasse" },
      { name: "Sel", quantity: null, unit: null },
    ]);
  });

  it("fusionne un article identique non coché, sinon ajoute", () => {
    let n = 0;
    const result = mergeDrafts(
      [item({ id: "1", name: "Lait", quantity: 1 }), item({ id: "2", name: "Riz", checked: true, quantity: 1 })],
      [
        { name: "lait", quantity: 2, unit: "tasse" },
        { name: "Riz", quantity: 1, unit: "tasse" },
      ],
      () => `n${++n}`,
      true,
    );
    expect(result.merged).toBe(1);
    expect(result.added).toBe(1);
    expect(result.items.find((entry) => entry.id === "1")?.quantity).toBe(3);
    expect(result.items.at(-1)).toMatchObject({ id: "n1", name: "Riz", fromRecipe: true, checked: false });
  });

  it("respecte la limite d'articles", () => {
    const full = Array.from({ length: MAX_ITEMS }, (_, i) => item({ id: String(i), name: `Article ${i}` }));
    const result = mergeDrafts(full, [{ name: "Nouveau", quantity: null, unit: null }], () => "z", false);
    expect(result.added).toBe(0);
    expect(result.items).toHaveLength(MAX_ITEMS);
  });

  it("décrit la progression et les quantités", () => {
    expect(progressLabel(0, 0)).toBe("Liste vide");
    expect(progressLabel(5, 2)).toBe("2 sur 5 cochés");
    expect(progressLabel(3, 3)).toBe("3 articles cochés");
    expect(itemQuantity({ quantity: 2.5, unit: "tasses" })).toBe("2,5 tasses");
    expect(itemQuantity({ quantity: null, unit: null })).toBe("");
  });
});

const recipe = (id: string, name: string, origin: string | null, allergens: string[] = []) =>
  ({ id, name, allergens, mayContain: [], origin: origin ? { code: origin, name: origin === "MA" ? "Maroc" : "Italie" } : null }) as unknown as Recipe;

describe("catalogue", () => {
  const all = [recipe("1", "Couscous aux légumes", "MA"), recipe("2", "Pâtes", "IT", ["wheat_gluten"]), recipe("3", "Tajine", "MA"), recipe("4", "Salade", null)];

  it("cherche dans le nom et le pays, sans accents", () => {
    expect(searchRecipes(all, "legumes").map((r) => r.id)).toEqual(["1"]);
    expect(searchRecipes(all, "maroc").map((r) => r.id)).toEqual(["1", "3"]);
    expect(searchRecipes(all, "  ")).toHaveLength(4);
  });

  it("masque aussi côté appareil les recettes à allergène et les compte", () => {
    const view = visibleCatalog({ recipes: all, hiddenCount: 2 }, ["wheat_gluten"]);
    expect(view.recipes.map((r) => r.id)).toEqual(["1", "3", "4"]);
    expect(view.hiddenCount).toBe(3);
  });

  it("regroupe par pays, le plus fourni d'abord, en ignorant les recettes sans origine", () => {
    const groups = groupByOrigin(all);
    expect(groups.map((g) => [g.country.code, g.recipes.length])).toEqual([["MA", 2], ["IT", 1]]);
  });
});
