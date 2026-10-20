export const ALLERGENS = [
  "peanuts",
  "tree_nuts",
  "milk",
  "eggs",
  "wheat_gluten",
  "soy",
  "fish",
  "shellfish",
  "sesame",
  "mustard",
  "sulphites",
] as const;

export type Allergen = (typeof ALLERGENS)[number];

export const DIETS = [
  "omnivore",
  "vegetarian",
  "vegan",
  "pescatarian",
  "no_pork",
  "no_beef",
] as const;

export type Diet = (typeof DIETS)[number];

export const SLOTS = ["breakfast", "lunch", "dinner"] as const;
export type Slot = (typeof SLOTS)[number];

export const BREAKFAST_PREFS = ["rapide", "sucre", "sale", "proteines", "vegetarien", "emporter"] as const;
export const LUNCH_PREFS = ["complet", "leger", "rapide", "vegetarien", "avance", "transport"] as const;
export const DINNER_PREFS = ["familial", "economique", "leger", "legumes", "proteines", "vegetarien", "rapide"] as const;
export const GOALS = ["equilibre", "decouverte", "budget", "temps", "gaspillage", "nutrition"] as const;

export type BreakfastPref = (typeof BREAKFAST_PREFS)[number];
export type LunchPref = (typeof LUNCH_PREFS)[number];
export type DinnerPref = (typeof DINNER_PREFS)[number];
export type Goal = (typeof GOALS)[number];

export const GROCERY_CATEGORIES = [
  "fruits_legumes",
  "viandes_poissons",
  "laitiers",
  "boulangerie",
  "conserves",
  "surgeles",
  "epices",
  "autres",
] as const;

export type GroceryCategory = (typeof GROCERY_CATEGORIES)[number];

export const UNITS = ["g", "ml", "unite", "cas", "cac", "tasse", "pincee"] as const;
export type Unit = (typeof UNITS)[number];

export const SEASONS = ["printemps", "ete", "automne", "hiver", "toute"] as const;
export type Season = (typeof SEASONS)[number];

export const COST_ESTIMATE_DATE = "2026-10-19";
export const COST_SOURCE = "estimation_interne";

export type Contains = {
  pork: boolean;
  beef: boolean;
  poultry: boolean;
  fish: boolean;
  shellfish: boolean;
  dairy: boolean;
  egg: boolean;
  honey: boolean;
  legume: boolean;
};

export const EMPTY_CONTAINS: Contains = {
  pork: false,
  beef: false,
  poultry: false,
  fish: false,
  shellfish: false,
  dairy: false,
  egg: false,
  honey: false,
  legume: false,
};

export type Locale = "fr" | "en";
