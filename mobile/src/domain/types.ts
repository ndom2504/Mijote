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

/** Lieu canadien (ville, quartier ou zone de code postal) choisi pour chercher des épiceries. */
export interface StorePlace {
  label: string;
  city: string;
  province: string | null;
  provinceName: string | null;
  lat: number;
  lon: number;
}

export type StoreKind = "supermarket" | "grocery" | "greengrocer" | "wholesale";

export interface GroceryStore {
  id: string;
  name: string;
  kind: StoreKind;
  brand: string | null;
  address: string | null;
  city: string | null;
  distanceKm: number;
  website: string | null;
}

export interface StoreChain {
  name: string;
  kind: "supermarket" | "discount" | "warehouse" | "specialty";
  website: string | null;
}

/** `live` : tout juste récupéré ; `cache` : récupéré récemment ; `stale` : ancien (réseau indisponible). */
export type StoresFreshness = "live" | "cache" | "stale" | "unavailable";

export interface NearbyStores {
  /** Faux hors Canada : la recherche d'épiceries ne couvre que le Canada. */
  supported: boolean;
  /** Aucun lieu connu : la personne doit en choisir un. */
  needsPlace: boolean;
  /** Le lieu du profil n'a pas pu être résolu (service en ligne indisponible). */
  placeUnavailable: boolean;
  place: StorePlace | null;
  stores: GroceryStore[];
  chains: StoreChain[];
  freshness: StoresFreshness | null;
  radiusKm: number | null;
  attribution: string;
}
