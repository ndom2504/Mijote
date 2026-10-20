import { EMPTY_PROFILE } from "../../domain/preferences";
import type { Profile, Recipe, ShoppingListItem } from "../../domain/types";

export interface DemoList {
  id: string;
  name: string;
  items: ShoppingListItem[];
  updatedAt: string;
}

/**
 * Données de démonstration : tout reste en mémoire, pour la session seulement. Un seul magasin est partagé
 * entre le dépôt de recettes et les services personnels, pour que les allergies saisies en démonstration
 * filtrent aussi la recette du jour.
 */
export interface DemoStore {
  profile: Profile;
  favorites: Recipe[];
  saved: Recipe[];
  lists: DemoList[];
  /** Photo de profil choisie en démonstration (adresse `data:`), gardée en mémoire seulement. */
  avatar: string | null;
  counter: number;
}

export function createDemoStore(): DemoStore {
  return { profile: { ...EMPTY_PROFILE, firstName: "", countryCode: "CA" }, favorites: [], saved: [], lists: [], avatar: null, counter: 0 };
}

export function nextDemoId(store: DemoStore, prefix: string): string {
  store.counter += 1;
  return `${prefix}-${store.counter}`;
}
