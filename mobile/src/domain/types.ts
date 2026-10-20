export type MealSlot = "breakfast" | "lunch" | "dinner";

export type Difficulty = "facile" | "moyen";

export interface Country {
  code: string;
  name: string;
}

export interface RecipeIngredient {
  name: string;
  quantity: number | null;
  unit: string | null;
}

export interface Recipe {
  id: string;
  slug: string;
  name: string;
  description: string;
  photoUrl: string | null;
  photoCredit: string | null;
  prepMinutes: number;
  cookMinutes: number;
  servings: number;
  difficulty: Difficulty;
  costNote: string | null;
  /** Allergènes contenus (codes). */
  allergens: string[];
  /** Allergènes pouvant être présents par contamination croisée (codes). */
  mayContain: string[];
  ingredients: RecipeIngredient[];
  steps: string[];
  /** Origine culinaire documentée dans le catalogue, ou null (cuisine du monde). */
  origin: Country | null;
}

export interface DailyPick {
  slot: MealSlot;
  date: string;
  country: Country | null;
  match: "locale" | "internationale" | null;
  notice: string;
  recipe: Recipe | null;
  source: "api" | "demo";
}

export interface DailyRequest {
  date: string;
  hour: number;
  slot?: MealSlot;
}

export type DataSource = "api" | "demo";

/** Profil alimentaire modifiable depuis l'application (codes identiques à ceux du serveur). */
export interface Profile {
  firstName: string;
  countryCode: string;
  municipalityCode: string;
  municipalityName: string | null;
  regionName: string | null;
  householdSize: number;
  cookingTimeMinutes: number;
  diets: string[];
  allergens: string[];
  otherExclusions: string[];
  breakfastPrefs: string[];
  lunchPrefs: string[];
  dinnerPrefs: string[];
  goals: string[];
  customDietNotes: string;
  /** Champs conservés tels quels à l'enregistrement (modifiables sur le site). */
  postalCode: string;
  locale: "fr" | "en";
  weeklyBudgetCents: number;
}

export interface Place {
  code: string;
  name: string;
  region: string;
}

export interface ShoppingListSummary {
  id: string;
  name: string;
  itemCount: number;
  checkedCount: number;
  updatedAt: string;
}

export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  checked: boolean;
  fromRecipe: boolean;
}

export interface ShoppingListDetail {
  id: string;
  name: string;
  items: ShoppingListItem[];
}

export interface Catalog {
  recipes: Recipe[];
  /** Recettes masquées à cause des allergies, du régime ou des exclusions. */
  hiddenCount: number;
}
