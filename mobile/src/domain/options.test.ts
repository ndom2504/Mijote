import { describe, expect, it } from "vitest";
import {
  ALLERGENS as SERVER_ALLERGENS,
  BREAKFAST_PREFS as SERVER_BREAKFAST,
  DIETS as SERVER_DIETS,
  DINNER_PREFS as SERVER_DINNER,
  GOALS as SERVER_GOALS,
  LUNCH_PREFS as SERVER_LUNCH,
} from "../../../src/lib/constants";
import { ALLERGENS, BREAKFAST_PREFS, DIETS, DINNER_PREFS, GOALS, LUNCH_PREFS, TIME_CHOICES, TIME_RANGE } from "./options";

const codes = (options: readonly { code: string }[]) => options.map((option) => option.code);

describe("options : parité avec le serveur", () => {
  it("expose exactement les mêmes codes que le serveur", () => {
    expect(codes(ALLERGENS)).toEqual([...SERVER_ALLERGENS]);
    expect(codes(DIETS)).toEqual([...SERVER_DIETS]);
    expect(codes(BREAKFAST_PREFS)).toEqual([...SERVER_BREAKFAST]);
    expect(codes(LUNCH_PREFS)).toEqual([...SERVER_LUNCH]);
    expect(codes(DINNER_PREFS)).toEqual([...SERVER_DINNER]);
    expect(codes(GOALS)).toEqual([...SERVER_GOALS]);
  });

  it("donne un libellé non vide à chaque option", () => {
    for (const list of [ALLERGENS, DIETS, BREAKFAST_PREFS, LUNCH_PREFS, DINNER_PREFS, GOALS]) {
      for (const option of list) expect(option.label.trim().length).toBeGreaterThan(0);
    }
  });

  it("propose des temps dans les bornes acceptées par le serveur", () => {
    for (const minutes of TIME_CHOICES) {
      expect(minutes).toBeGreaterThanOrEqual(TIME_RANGE.min);
      expect(minutes).toBeLessThanOrEqual(TIME_RANGE.max);
    }
  });
});
