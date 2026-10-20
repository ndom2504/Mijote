import type { Difficulty, MealSlot } from "../domain/types";

export const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: "Déjeuner",
  lunch: "Dîner",
  dinner: "Souper",
};

export function greetingForHour(hour: number): string {
  return hour >= 5 && hour < 18 ? "Bonjour !" : "Bonsoir !";
}

export function totalMinutes(recipe: { prepMinutes: number; cookMinutes: number }): number {
  return recipe.prepMinutes + recipe.cookMinutes;
}

export function portionsLabel(servings: number): string {
  return `${servings} ${servings > 1 ? "portions" : "portion"}`;
}

export function difficultyLabel(difficulty: Difficulty): string {
  return difficulty === "moyen" ? "Moyen" : "Facile";
}

export function quantityLabel(quantity: number | null, unit: string | null): string {
  if (quantity == null) return "";
  const rounded = Math.round(quantity * 100) / 100;
  const text = String(rounded).replace(".", ",");
  if (unit === "unite") return `${text} ${rounded > 1 ? "unités" : "unité"}`;
  return unit ? `${text} ${unit}` : text;
}

/** Date locale de l'appareil (AAAA-MM-JJ) et heure 0–23. */
export function localStamp(now: Date = new Date()): { date: string; hour: number } {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return { date: `${now.getFullYear()}-${month}-${day}`, hour: now.getHours() };
}

/** Drapeau emoji à partir d'un code pays ISO à deux lettres. */
export function flagEmoji(code: string | null | undefined): string {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return "";
  return String.fromCodePoint(...[...code.toUpperCase()].map((char) => 0x1f1e6 + char.charCodeAt(0) - 65));
}

export function normalizeSearch(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr").trim();
}
