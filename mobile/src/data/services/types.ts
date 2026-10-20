import type { Catalog, NearbyStores, Place, Profile, Recipe, ShoppingListDetail, ShoppingListSummary, StorePlace } from "../../domain/types";

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

export interface AvatarService {
  /** Adresse `data:` de la photo de profil, ou `null` si aucune n'est définie. */
  get(): Promise<string | null>;
  /** Envoie une photo (JPEG en base64, déjà réduit) et renvoie son adresse `data:`. */
  set(base64: string): Promise<string>;
  remove(): Promise<void>;
}

export interface StoresService {
  /** Épiceries près du lieu choisi, ou près du lieu du profil si aucun n'est donné. */
  nearby(place?: StorePlace | null): Promise<NearbyStores>;
  /** Recherche d'une ville, d'un quartier ou d'un code postal canadien. */
  searchPlaces(term: string): Promise<StorePlace[]>;
}

export interface PersonalServices {
  readonly source: "api" | "demo";
  profile: ProfileService;
  avatar: AvatarService;
  /** Absent en démonstration : la recherche d'épiceries passe par le serveur. */
  stores?: StoresService;
  saved: SavedService;
  lists: ListsService;
  catalog: CatalogService;
}
