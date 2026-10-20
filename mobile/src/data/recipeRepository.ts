import type { Country, DailyPick, DailyRequest, Difficulty, MealSlot, Recipe, RecipeIngredient } from "../domain/types";
import { mealSlotForHour } from "../config/mealWindows";
import { countryByCode } from "./countries";
import { request } from "./client";
import { allergenHits, isUnsafe } from "../domain/allergens";
import { DEMO_RECIPES } from "./demo/recipes";
import { createDemoStore, type DemoStore } from "./demo/store";

export interface RecipeRepository {
  readonly source: "api" | "demo";
  daily(input: DailyRequest): Promise<DailyPick>;
  favorites(): Promise<Recipe[]>;
  setFavorite(recipe: Recipe, favorite: boolean): Promise<void>;
  setCountry(code: string): Promise<void>;
}

export interface RawRecipe {
  id: string;
  slug: string;
  name: string;
  description: string;
  photoUrl: string | null;
  photoCredit: string | null;
  prepMinutes: number;
  cookMinutes: number;
  servings: number;
  difficulty?: string;
  costNote: string | null;
  allergens: string[];
  mayContain?: string[];
  ingredients: RecipeIngredient[];
  steps: string[];
  origin?: Country | null;
}

interface RawDaily {
  slot: MealSlot;
  date: string;
  country: Country | null;
  match: "locale" | "internationale" | null;
  origin?: Country | null;
  notice: string;
  recipe: RawRecipe | null;
}

export function mapRecipe(raw: RawRecipe, origin: Country | null): Recipe {
  const difficulty: Difficulty = raw.difficulty === "moyen" ? "moyen" : "facile";
  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    description: raw.description,
    photoUrl: raw.photoUrl,
    photoCredit: raw.photoCredit,
    prepMinutes: raw.prepMinutes,
    cookMinutes: raw.cookMinutes,
    servings: raw.servings,
    difficulty,
    costNote: raw.costNote,
    allergens: raw.allergens ?? [],
    mayContain: raw.mayContain ?? [],
    ingredients: raw.ingredients ?? [],
    steps: raw.steps ?? [],
    origin,
  };
}

/** Catalogue réel : recommandations filtrées par allergies, pays et heure côté serveur. */
export function createRemoteRepository(base: string, token: string): RecipeRepository {
  return {
    source: "api",
    async daily({ date, hour, slot }) {
      const params = new URLSearchParams({ date, hour: String(hour) });
      if (slot) params.set("slot", slot);
      const raw = await request<RawDaily>(base, `/api/mobile/du-jour?${params.toString()}`, { token });
      return {
        slot: raw.slot,
        date: raw.date,
        country: raw.country,
        match: raw.match,
        notice: raw.notice,
        recipe: raw.recipe ? mapRecipe(raw.recipe, raw.origin ?? null) : null,
        source: "api",
      };
    },
    async favorites() {
      const raw = await request<{ recipes: RawRecipe[] }>(base, "/api/mobile/favoris", { token });
      return raw.recipes.map((recipe) => mapRecipe(recipe, recipe.origin ?? null));
    },
    async setFavorite(recipe, favorite) {
      await request(base, "/api/menus", { method: "POST", token, body: { action: "favorite", recipeId: recipe.id, favorite } });
    },
    async setCountry(code) {
      await request(base, "/api/mobile/pays", { method: "POST", token, body: { countryCode: code } });
    },
  };
}

/** Données d'exemple, gardées en mémoire pour la session seulement. Les allergies déclarées filtrent aussi la démonstration. */
export function createDemoRepository(store: DemoStore = createDemoStore()): RecipeRepository {
  return {
    source: "demo",
    async daily({ date, hour, slot }) {
      const resolved: MealSlot = slot ?? mealSlotForHour(hour);
      const candidate = DEMO_RECIPES[resolved];
      const unsafe = isUnsafe(allergenHits(candidate, store.profile.allergens));
      return {
        slot: resolved,
        date,
        country: countryByCode(store.profile.countryCode),
        match: null,
        notice: unsafe
          ? "Mode démonstration : la recette d'exemple de ce repas touche à une de tes allergies, donc elle n'est pas proposée."
          : "Mode démonstration : recettes d'exemple, aucune tendance réelle.",
        recipe: unsafe ? null : candidate,
        source: "demo",
      };
    },
    async favorites() {
      return store.favorites;
    },
    async setFavorite(recipe, favorite) {
      store.favorites = favorite ? [recipe, ...store.favorites.filter((item) => item.id !== recipe.id)] : store.favorites.filter((item) => item.id !== recipe.id);
    },
    async setCountry(code) {
      store.profile = { ...store.profile, countryCode: code };
    },
  };
}
