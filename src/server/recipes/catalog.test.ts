import { describe, expect, it } from "vitest";
import { catalog } from "@/server/recipes/catalog";
import { scanIngredients } from "@/server/recipes/lexicon";

describe("catalogue", () => {
  it("contient au moins 60 recettes couvrant les trois repas", () => {
    expect(catalog.length).toBeGreaterThanOrEqual(60);
    for (const slot of ["breakfast", "lunch", "dinner"] as const) {
      expect(catalog.filter((recipe) => recipe.mealSlots.includes(slot)).length).toBeGreaterThanOrEqual(15);
    }
  });

  it("aligne les allergènes sur les ingrédients et n'invente pas de valeur nutritionnelle", () => {
    for (const recipe of catalog) {
      const scan = scanIngredients(recipe.ingredients);
      expect(recipe.allergens).toEqual(scan.allergens);
      expect(recipe.costSource).toBe("estimation_interne");
      expect(recipe.costNoteFr.toLowerCase()).toContain("pas un prix");
      expect(JSON.stringify(recipe)).not.toMatch(/calories|kcal/i);
      expect(recipe.stepsFr.length).toBeGreaterThanOrEqual(3);
      expect(recipe.ingredients.length).toBeGreaterThanOrEqual(3);
    }
  });
});
