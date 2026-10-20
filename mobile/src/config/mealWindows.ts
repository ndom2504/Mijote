import type { MealSlot } from "../domain/types";

/**
 * Plages horaires des repas, en heures locales (0–23).
 * Déjeuner dès `breakfastFrom`, dîner dès `lunchFrom`, souper dès `dinnerFrom`
 * et jusqu'au prochain `breakfastFrom`.
 */
export interface MealWindows {
  breakfastFrom: number;
  lunchFrom: number;
  dinnerFrom: number;
}

export const DEFAULT_MEAL_WINDOWS: MealWindows = { breakfastFrom: 5, lunchFrom: 11, dinnerFrom: 16 };

/**
 * Habitudes par pays (code ISO). Vide tant qu'aucune source documentée n'est ajoutée :
 * Mijoté n'invente pas d'habitudes régionales. Exemple d'ajout :
 * `XX: { breakfastFrom: 6, lunchFrom: 12, dinnerFrom: 18 }`.
 */
export const COUNTRY_MEAL_WINDOWS: Partial<Record<string, MealWindows>> = {};

export function isValidWindows(windows: MealWindows): boolean {
  const values = [windows.breakfastFrom, windows.lunchFrom, windows.dinnerFrom];
  return (
    values.every((value) => Number.isInteger(value) && value >= 0 && value <= 23) &&
    windows.breakfastFrom < windows.lunchFrom &&
    windows.lunchFrom < windows.dinnerFrom
  );
}

/** Priorité : réglage de l'utilisateur, puis habitudes du pays, puis valeurs par défaut. */
export function resolveMealWindows(
  countryCode: string | null | undefined,
  userOverride?: Partial<MealWindows> | null,
): MealWindows {
  const base = (countryCode && COUNTRY_MEAL_WINDOWS[countryCode]) || DEFAULT_MEAL_WINDOWS;
  if (!userOverride) return base;
  const merged: MealWindows = { ...base, ...userOverride };
  return isValidWindows(merged) ? merged : base;
}

export function mealSlotForHour(hour: number, windows: MealWindows = DEFAULT_MEAL_WINDOWS): MealSlot {
  if (hour >= windows.dinnerFrom || hour < windows.breakfastFrom) return "dinner";
  if (hour >= windows.lunchFrom) return "lunch";
  return "breakfast";
}
