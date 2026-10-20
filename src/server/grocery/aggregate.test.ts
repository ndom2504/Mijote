import { describe, expect, it } from "vitest";
import { aggregateGroceries } from "@/server/grocery/aggregate";
import { scaleQuantity } from "@/lib/quantity";

describe("liste d'épicerie", () => {
  it("additionne les quantités compatibles et signale les unités incompatibles", () => {
    const lines = aggregateGroceries([
      { name: "Carottes", quantity: 200, unit: "g", category: "fruits_legumes", scalable: true, recipeServings: 2, targetServings: 2, recipeId: "a" },
      { name: "carottes", quantity: 100, unit: "g", category: "fruits_legumes", scalable: true, recipeServings: 2, targetServings: 2, recipeId: "b" },
      { name: "Carottes", quantity: 1, unit: "tasse", category: "fruits_legumes", scalable: true, recipeServings: 1, targetServings: 1, recipeId: "c" },
    ]);
    const grams = lines.find((line) => line.unit === "g");
    const cups = lines.find((line) => line.unit === "tasse");
    expect(grams?.quantity).toBe(300);
    expect(grams?.recipeCount).toBe(2);
    expect(grams?.mergeNote).toContain("Unité différente");
    expect(cups?.mergeNote).toContain("Unité différente");
  });

  it("ajuste les portions", () => {
    expect(scaleQuantity(100, 2, 4, true)).toBe(200);
    const lines = aggregateGroceries([
      { name: "Riz", quantity: 150, unit: "g", category: "boulangerie", scalable: true, recipeServings: 1, targetServings: 3, recipeId: "a" },
    ]);
    expect(lines[0]?.quantity).toBe(450);
  });

  it("convertit les kilogrammes et n'additionne pas une quantité absente", () => {
    const lines = aggregateGroceries([
      { name: "Pommes de terre", quantity: 0.5, unit: "kg", category: "fruits_legumes", scalable: true, recipeServings: 1, targetServings: 1, recipeId: "a" },
      { name: "Pommes de terre", quantity: 200, unit: "g", category: "fruits_legumes", scalable: true, recipeServings: 1, targetServings: 1, recipeId: "b" },
      { name: "Sel", quantity: null, unit: null, category: "epices", scalable: false, recipeServings: 1, targetServings: 4, recipeId: "a" },
    ]);
    expect(lines.find((line) => line.name === "Pommes de terre")?.quantity).toBe(700);
    const salt = lines.find((line) => line.name === "Sel");
    expect(salt?.quantity).toBeNull();
    expect(salt?.mergeNote).toContain("non précisée");
  });
});
