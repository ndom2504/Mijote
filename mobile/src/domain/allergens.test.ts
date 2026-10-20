import { describe, expect, it } from "vitest";
import { allergenHits, filterSafe, isUnsafe, recipesAtRisk, warningText } from "./allergens";
import type { Recipe } from "./types";

const recipe = (id: string, allergens: string[], mayContain: string[] = []) =>
  ({ id, allergens, mayContain }) as unknown as Recipe;

describe("allergènes", () => {
  it("sépare ce qui est contenu de ce qui peut l'être", () => {
    const hits = allergenHits(recipe("a", ["milk", "eggs"], ["peanuts", "milk"]), ["milk", "peanuts"]);
    expect(hits.contains).toEqual(["milk"]);
    expect(hits.mayContain).toEqual(["peanuts"]);
    expect(isUnsafe(hits)).toBe(true);
  });

  it("ne signale rien sans allergie déclarée", () => {
    const hits = allergenHits(recipe("a", ["milk"], ["soy"]), []);
    expect(isUnsafe(hits)).toBe(false);
    expect(warningText(hits)).toBeNull();
  });

  it("écrit un avertissement lisible, « contient » avant « peut contenir »", () => {
    expect(warningText(allergenHits(recipe("a", ["fish"]), ["fish"]))).toBe("Contient : Poisson");
    expect(warningText(allergenHits(recipe("a", [], ["sesame"]), ["sesame"]))).toBe("Peut contenir : Sésame");
  });

  it("filtre les recettes qui touchent à une allergie, y compris les traces", () => {
    const list = [recipe("ok", ["eggs"]), recipe("direct", ["fish"]), recipe("traces", [], ["fish"])];
    expect(filterSafe(list, ["fish"]).map((item) => item.id)).toEqual(["ok"]);
    expect(recipesAtRisk(list, ["fish"]).map((item) => item.id)).toEqual(["direct", "traces"]);
    expect(filterSafe(list, []).length).toBe(3);
  });
});
