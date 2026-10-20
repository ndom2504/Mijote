import { describe, expect, it } from "vitest";
import { mealSlotForHour, pickDaily, type DailyCandidate } from "@/server/recommendations/daily";

const recipes: DailyCandidate[] = [
  { id: "1", slug: "gruau", mealSlots: ["breakfast"], allergens: [], crossContamination: ["wheat_gluten"], origin: "CA" },
  { id: "2", slug: "arachide", mealSlots: ["breakfast"], allergens: ["peanuts"], crossContamination: [], origin: "CA" },
  { id: "3", slug: "minestrone", mealSlots: ["lunch"], allergens: ["wheat_gluten"], crossContamination: [], origin: "IT" },
  { id: "4", slug: "salade", mealSlots: ["lunch"], allergens: [], crossContamination: [], origin: null },
  { id: "5", slug: "dal", mealSlots: ["dinner"], allergens: [], crossContamination: [], origin: "IN" },
];

describe("recette du moment", () => {
  it("choisit le repas selon l'heure", () => {
    expect(mealSlotForHour(8)).toBe("breakfast");
    expect(mealSlotForHour(12)).toBe("lunch");
    expect(mealSlotForHour(19)).toBe("dinner");
    expect(mealSlotForHour(2)).toBe("dinner");
  });

  it("privilégie le pays d'inscription et écarte l'allergène", () => {
    const picked = pickDaily(recipes, { country: "CA", slot: "breakfast", date: "2026-10-20", userId: "alice", allergens: ["peanuts"] });
    expect(picked?.recipe.slug).toBe("gruau");
    expect(picked?.match).toBe("locale");
  });

  it("passe à une autre cuisine quand le pays n'a pas de recette pour ce repas", () => {
    const picked = pickDaily(recipes, { country: "JP", slot: "lunch", date: "2026-10-20", userId: "alice", allergens: ["wheat_gluten"] });
    expect(picked?.match).toBe("internationale");
    expect(picked?.recipe.slug).toBe("salade");
  });

  it("reste stable pour la même personne et la même journée", () => {
    const first = pickDaily(recipes, { country: "IN", slot: "dinner", date: "2026-10-20", userId: "alice", allergens: [] });
    const second = pickDaily(recipes, { country: "IN", slot: "dinner", date: "2026-10-20", userId: "alice", allergens: [] });
    expect(first?.recipe.id).toBe(second?.recipe.id);
    expect(first?.match).toBe("locale");
  });
});
