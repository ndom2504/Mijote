import { describe, expect, it } from "vitest";
import { DEFAULT_MEAL_WINDOWS, isValidWindows, mealSlotForHour, resolveMealWindows } from "./mealWindows";

describe("plages horaires des repas", () => {
  it("choisit déjeuner, dîner ou souper selon l'heure par défaut", () => {
    expect(mealSlotForHour(5)).toBe("breakfast");
    expect(mealSlotForHour(10)).toBe("breakfast");
    expect(mealSlotForHour(11)).toBe("lunch");
    expect(mealSlotForHour(15)).toBe("lunch");
    expect(mealSlotForHour(16)).toBe("dinner");
    expect(mealSlotForHour(23)).toBe("dinner");
    expect(mealSlotForHour(2)).toBe("dinner");
  });

  it("applique le réglage de l'utilisateur lorsqu'il est valide", () => {
    const windows = resolveMealWindows("CA", { breakfastFrom: 6, lunchFrom: 13, dinnerFrom: 19 });
    expect(mealSlotForHour(12, windows)).toBe("breakfast");
    expect(mealSlotForHour(13, windows)).toBe("lunch");
    expect(mealSlotForHour(19, windows)).toBe("dinner");
  });

  it("ignore un réglage incohérent et garde les valeurs par défaut", () => {
    expect(resolveMealWindows("CA", { breakfastFrom: 14, lunchFrom: 12 })).toEqual(DEFAULT_MEAL_WINDOWS);
    expect(isValidWindows({ breakfastFrom: 5, lunchFrom: 11, dinnerFrom: 24 })).toBe(false);
  });

  it("garde les valeurs par défaut pour un pays sans habitude documentée", () => {
    expect(resolveMealWindows("JP")).toEqual(DEFAULT_MEAL_WINDOWS);
    expect(resolveMealWindows(null)).toEqual(DEFAULT_MEAL_WINDOWS);
  });
});
