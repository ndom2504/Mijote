import { allergenLabel } from "./allergens";
import {
  BREAKFAST_PREFS,
  DINNER_PREFS,
  DIETS,
  EXCLUSION_LENGTH,
  GOALS,
  LUNCH_PREFS,
  MAX_EXCLUSIONS,
  SERVINGS_RANGE,
  TIME_RANGE,
  labelOf,
  shortLabelOf,
} from "./options";
import type { Profile } from "./types";

export const EMPTY_PROFILE: Profile = {
  firstName: "",
  countryCode: "CA",
  municipalityCode: "",
  municipalityName: null,
  regionName: null,
  householdSize: 2,
  cookingTimeMinutes: 45,
  diets: ["omnivore"],
  allergens: [],
  otherExclusions: [],
  breakfastPrefs: [],
  lunchPrefs: [],
  dinnerPrefs: [],
  goals: [],
  customDietNotes: "",
  postalCode: "",
  locale: "fr",
  weeklyBudgetCents: 18000,
};

/** Régimes de base : un seul à la fois. « Sans porc » et « Sans bœuf » s'ajoutent à n'importe lequel. */
const BASE_DIETS = ["omnivore", "vegetarian", "vegan", "pescatarian"] as const;

const isBaseDiet = (code: string) => (BASE_DIETS as readonly string[]).includes(code);

/** Coche ou décoche un régime en gardant un ensemble cohérent : toujours un régime de base (« omnivore » par défaut). */
export function toggleDiet(current: string[], code: string): string[] {
  let next: string[];
  if (current.includes(code)) next = current.filter((item) => item !== code);
  else if (isBaseDiet(code)) next = [...current.filter((item) => !isBaseDiet(item)), code];
  else next = [...current, code];
  return next.some(isBaseDiet) ? next : ["omnivore", ...next];
}

export function toggleCode(current: string[], code: string): string[] {
  return current.includes(code) ? current.filter((item) => item !== code) : [...current, code];
}

export function normalizeTerm(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr").replace(/\s+/g, " ").trim();
}

export type ExclusionResult = { ok: true; list: string[] } | { ok: false; error: "too_short" | "too_long" | "duplicate" | "limit" };

/** Ajoute un ingrédient à éviter (3 à 60 caractères, sans doublon, 30 au plus). */
export function addExclusion(current: string[], raw: string): ExclusionResult {
  const term = raw.replace(/\s+/g, " ").trim();
  if (term.length < EXCLUSION_LENGTH.min) return { ok: false, error: "too_short" };
  if (term.length > EXCLUSION_LENGTH.max) return { ok: false, error: "too_long" };
  if (current.some((item) => normalizeTerm(item) === normalizeTerm(term))) return { ok: false, error: "duplicate" };
  if (current.length >= MAX_EXCLUSIONS) return { ok: false, error: "limit" };
  return { ok: true, list: [...current, term] };
}

export function exclusionMessage(error: "too_short" | "too_long" | "duplicate" | "limit"): string {
  switch (error) {
    case "too_short":
      return `Écris au moins ${EXCLUSION_LENGTH.min} lettres.`;
    case "too_long":
      return `${EXCLUSION_LENGTH.max} caractères au plus.`;
    case "duplicate":
      return "Cet ingrédient est déjà dans la liste.";
    default:
      return `Tu peux éviter jusqu'à ${MAX_EXCLUSIONS} ingrédients.`;
  }
}

export function clampServings(value: number): number {
  return Math.min(SERVINGS_RANGE.max, Math.max(SERVINGS_RANGE.min, Math.round(value)));
}

export function clampMinutes(value: number): number {
  return Math.min(TIME_RANGE.max, Math.max(TIME_RANGE.min, Math.round(value)));
}

const sameSet = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join("|") === [...b].sort().join("|");

/** Vrai si la personne a modifié un champ modifiable (le pays s'enregistre à part). */
export function isDirty(a: Profile, b: Profile): boolean {
  return (
    a.firstName.trim() !== b.firstName.trim() ||
    a.municipalityCode !== b.municipalityCode ||
    a.householdSize !== b.householdSize ||
    a.cookingTimeMinutes !== b.cookingTimeMinutes ||
    !sameSet(a.diets, b.diets) ||
    !sameSet(a.allergens, b.allergens) ||
    !sameSet(a.otherExclusions, b.otherExclusions) ||
    !sameSet(a.breakfastPrefs, b.breakfastPrefs) ||
    !sameSet(a.lunchPrefs, b.lunchPrefs) ||
    !sameSet(a.dinnerPrefs, b.dinnerPrefs) ||
    !sameSet(a.goals, b.goals)
  );
}

/** Allergies retirées entre deux versions : leur retrait demande une confirmation. */
export function removedAllergens(before: Profile, after: Profile): string[] {
  return before.allergens.filter((code) => !after.allergens.includes(code));
}

export type ChipKind = "allergy" | "diet" | "avoid" | "pref" | "info";

export interface PreferenceChip {
  key: string;
  label: string;
  kind: ChipKind;
}

/**
 * Pastilles du tableau de bord, tirées uniquement du profil enregistré. Les allergies passent en premier et
 * restent visuellement distinctes ; au-delà de `max`, le reste est résumé par « +N ».
 */
export function preferenceChips(profile: Profile, max = 6): { chips: PreferenceChip[]; extra: number } {
  const all: PreferenceChip[] = [];
  for (const code of profile.allergens) all.push({ key: `allergy:${code}`, label: `Allergie : ${allergenLabel(code)}`, kind: "allergy" });
  for (const code of profile.diets) if (code !== "omnivore") all.push({ key: `diet:${code}`, label: labelOf(DIETS, code), kind: "diet" });
  for (const term of profile.otherExclusions) all.push({ key: `avoid:${normalizeTerm(term)}`, label: `Sans ${term}`, kind: "avoid" });
  const seen = new Set<string>();
  const prefs = [
    ...profile.breakfastPrefs.map((code) => labelOf(BREAKFAST_PREFS, code)),
    ...profile.lunchPrefs.map((code) => labelOf(LUNCH_PREFS, code)),
    ...profile.dinnerPrefs.map((code) => labelOf(DINNER_PREFS, code)),
    ...profile.goals.map((code) => shortLabelOf(GOALS, code)),
  ];
  for (const label of prefs) {
    if (seen.has(label)) continue;
    seen.add(label);
    all.push({ key: `pref:${label}`, label, kind: "pref" });
  }
  all.push({ key: "time", label: `${profile.cookingTimeMinutes} min ou moins`, kind: "info" });
  all.push({ key: "servings", label: `${profile.householdSize} ${profile.householdSize > 1 ? "portions" : "portion"}`, kind: "info" });
  // Les allergies ne sont jamais reléguées dans « +N ».
  const allergies = all.filter((chip) => chip.kind === "allergy");
  const others = all.filter((chip) => chip.kind !== "allergy");
  const room = Math.max(0, max - allergies.length);
  return { chips: [...allergies, ...others.slice(0, room)], extra: Math.max(0, others.length - room) };
}

/** Données du formulaire d'enregistrement envoyé au serveur (le serveur revalide tout). */
export function profilePayload(profile: Profile) {
  return {
    firstName: profile.firstName.trim(),
    municipalityCode: profile.municipalityCode,
    postalCode: profile.postalCode,
    householdSize: clampServings(profile.householdSize),
    locale: profile.locale,
    weeklyBudgetCents: profile.weeklyBudgetCents,
    cookingTimeMinutes: clampMinutes(profile.cookingTimeMinutes),
    diets: profile.diets.length ? profile.diets : ["omnivore"],
    customDietNotes: profile.customDietNotes,
    allergens: profile.allergens,
    otherExclusions: profile.otherExclusions,
    breakfastPrefs: profile.breakfastPrefs,
    lunchPrefs: profile.lunchPrefs,
    dinnerPrefs: profile.dinnerPrefs,
    goals: profile.goals,
    onboardingCompleted: true,
  };
}

/** Salutation personnalisée selon l'heure locale. */
export function greetingFor(hour: number, firstName: string): string {
  const base = hour >= 5 && hour < 18 ? "Bonjour" : "Bonsoir";
  const name = firstName.trim();
  return name ? `${base} ${name} !` : `${base} !`;
}

export interface DashboardStats {
  saved: number | null;
  favorites: number | null;
  lists: number | null;
}

/** Statistiques réelles : un compteur inconnu (chargement ou erreur) reste `null`, jamais 0 inventé. */
export function dashboardStats(input: {
  saved: { status: string; items: unknown[] };
  favorites: { status: string; items: unknown[] };
  lists: { status: string; items: unknown[] };
}): DashboardStats {
  const count = (part: { status: string; items: unknown[] }) => (part.status === "ready" ? part.items.length : null);
  return { saved: count(input.saved), favorites: count(input.favorites), lists: count(input.lists) };
}
