import type { Catalog, Place, Profile, Recipe, ShoppingListDetail, ShoppingListSummary } from "../../domain/types";

/**
 * Couche de services du tableau de bord. Les écrans ne connaissent que ces interfaces :
 * - `api` : compte connecté, données du serveur Mijoté ;
 * - `demo` : données gardées en mémoire (mode démonstration), jamais envoyées au serveur.
 */
export interface ProfileService {
  get(): Promise<Profile>;
  /** Enregistre les préférences modifiables (le pays se change à part, avec le dépôt de recettes). */
  save(profile: Profile): Promise<void>;
  /** Recherche de municipalités (Québec) pour la région ; absente en démonstration. */
  searchPlaces?(term: string): Promise<Place[]>;
}

export interface SavedService {
  list(): Promise<Recipe[]>;
  set(recipe: Recipe, saved: boolean): Promise<void>;
}

export interface NewItem {
  name: string;
  quantity: number | null;
  unit: string | null;
}

export type ListErrorCode = "invalid_name" | "name_taken" | "limit" | "not_found";

export interface ListsService {
  overview(): Promise<ShoppingListSummary[]>;
  detail(id: string): Promise<ShoppingListDetail>;
  create(name: string): Promise<string>;
  rename(id: string, name: string): Promise<void>;
  remove(id: string): Promise<void>;
  addItem(listId: string, item: NewItem): Promise<void>;
  addRecipe(listId: string, recipe: Recipe, servings?: number): Promise<{ added: number; merged: number }>;
  setChecked(listId: string, itemId: string, checked: boolean): Promise<void>;
  removeItem(listId: string, itemId: string): Promise<void>;
  clearChecked(listId: string): Promise<void>;
}

export interface CatalogService {
  /** Catalogue déjà filtré selon les allergies, le régime et les exclusions de la personne. */
  load(): Promise<Catalog>;
}

export interface PersonalServices {
  readonly source: "api" | "demo";
  profile: ProfileService;
  saved: SavedService;
  lists: ListsService;
  catalog: CatalogService;
}
