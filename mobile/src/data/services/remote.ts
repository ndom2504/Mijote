import { request } from "../client";
import { mapRecipe, type RawRecipe } from "../recipeRepository";
import { EMPTY_PROFILE, profilePayload } from "../../domain/preferences";
import type { Place, Profile, ShoppingListDetail, ShoppingListSummary } from "../../domain/types";
import type { PersonalServices } from "./types";

interface RawProfile {
  firstName: string | null;
  municipalityCode: string | null;
  municipalityName: string | null;
  regionName: string | null;
  postalCode: string | null;
  householdSize: number;
  locale: "fr" | "en";
  weeklyBudgetCents: number;
  cookingTimeMinutes: number;
  diets: string[];
  customDietNotes: string | null;
  breakfastPrefs: string[];
  lunchPrefs: string[];
  dinnerPrefs: string[];
  goals: string[];
  otherExclusions: string[];
  allergens: string[];
  countryCode: string;
}

export function mapProfile(raw: RawProfile): Profile {
  return {
    firstName: raw.firstName ?? "",
    countryCode: raw.countryCode || "CA",
    municipalityCode: raw.municipalityCode ?? "",
    municipalityName: raw.municipalityName,
    regionName: raw.regionName,
    householdSize: raw.householdSize,
    cookingTimeMinutes: raw.cookingTimeMinutes,
    diets: raw.diets?.length ? raw.diets : ["omnivore"],
    allergens: raw.allergens ?? [],
    otherExclusions: raw.otherExclusions ?? [],
    breakfastPrefs: raw.breakfastPrefs ?? [],
    lunchPrefs: raw.lunchPrefs ?? [],
    dinnerPrefs: raw.dinnerPrefs ?? [],
    goals: raw.goals ?? [],
    customDietNotes: raw.customDietNotes ?? "",
    postalCode: raw.postalCode ?? "",
    locale: raw.locale ?? EMPTY_PROFILE.locale,
    weeklyBudgetCents: raw.weeklyBudgetCents ?? EMPTY_PROFILE.weeklyBudgetCents,
  };
}

interface RawPlace {
  code: string;
  name: string;
  region: string;
}

/** Services branchés sur l'API Mijoté. Toutes les requêtes portent le jeton de la session. */
export function createRemoteServices(base: string, token: string): PersonalServices {
  const call = <T>(path: string, options: { method?: string; body?: unknown } = {}) => request<T>(base, path, { ...options, token });
  const listAction = (body: Record<string, unknown>) => call<{ ok: boolean }>("/api/mobile/listes", { method: "POST", body });

  return {
    source: "api",
    profile: {
      async get() {
        const raw = await call<{ profile: RawProfile | null }>("/api/profile");
        if (!raw.profile) throw new Error("profile_missing");
        return mapProfile(raw.profile);
      },
      async save(profile) {
        await call("/api/profile", { method: "PUT", body: profilePayload(profile) });
      },
      async searchPlaces(term) {
        const raw = await call<{ results: RawPlace[] }>(`/api/geo?q=${encodeURIComponent(term)}`);
        return raw.results.slice(0, 20).map<Place>((place) => ({ code: place.code, name: place.name, region: place.region }));
      },
    },
    saved: {
      async list() {
        const raw = await call<{ recipes: RawRecipe[] }>("/api/mobile/sauvegardes");
        return raw.recipes.map((recipe) => mapRecipe(recipe, recipe.origin ?? null));
      },
      async set(recipe, saved) {
        await call("/api/mobile/sauvegardes", { method: "POST", body: { recipeId: recipe.id, saved } });
      },
    },
    lists: {
      async overview() {
        const raw = await call<{ lists: ShoppingListSummary[] }>("/api/mobile/listes");
        return raw.lists;
      },
      async detail(id) {
        const raw = await call<{ list: ShoppingListDetail }>(`/api/mobile/listes?id=${encodeURIComponent(id)}`);
        return raw.list;
      },
      async create(name) {
        const raw = await call<{ ok: boolean; id: string }>("/api/mobile/listes", { method: "POST", body: { action: "create", name } });
        return raw.id;
      },
      async rename(id, name) {
        await listAction({ action: "rename", id, name });
      },
      async remove(id) {
        await listAction({ action: "delete", id });
      },
      async addItem(listId, item) {
        await listAction({ action: "addItem", listId, name: item.name, quantity: item.quantity, unit: item.unit });
      },
      async addRecipe(listId, recipe, servings) {
        const raw = await call<{ ok: boolean; added: number; merged: number }>("/api/mobile/listes", {
          method: "POST",
          body: { action: "addRecipe", listId, recipeId: recipe.id, servings },
        });
        return { added: raw.added, merged: raw.merged };
      },
      async setChecked(_listId, itemId, checked) {
        await listAction({ action: "check", itemId, checked });
      },
      async removeItem(_listId, itemId) {
        await listAction({ action: "deleteItem", itemId });
      },
      async clearChecked(listId) {
        await listAction({ action: "clearChecked", listId });
      },
    },
    catalog: {
      async load() {
        const raw = await call<{ recipes: RawRecipe[]; hiddenCount: number }>("/api/mobile/recettes");
        return { recipes: raw.recipes.map((recipe) => mapRecipe(recipe, recipe.origin ?? null)), hiddenCount: raw.hiddenCount };
      },
    },
  };
}
