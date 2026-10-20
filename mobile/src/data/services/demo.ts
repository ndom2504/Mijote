import { ApiError } from "../client";
import { DEMO_RECIPES } from "../demo/recipes";
import { nextDemoId, type DemoStore } from "../demo/store";
import { filterSafe } from "../../domain/allergens";
import { cleanName, isNameTaken, MAX_LISTS, mergeDrafts, recipeDrafts } from "../../domain/lists";
import type { PersonalServices } from "./types";

const delay = () => new Promise<void>((resolve) => setTimeout(resolve, 60));

/** Services de démonstration : tout reste en mémoire pour la session, rien n'est envoyé au serveur. */
export function createDemoServices(store: DemoStore): PersonalServices {
  const listById = (id: string) => {
    const list = store.lists.find((item) => item.id === id);
    if (!list) throw new ApiError("not_found", 404);
    return list;
  };
  const touch = (id: string) => {
    listById(id).updatedAt = new Date().toISOString();
  };

  return {
    source: "demo",
    profile: {
      async get() {
        await delay();
        return store.profile;
      },
      async save(profile) {
        await delay();
        // Le pays se change à part (dépôt de recettes) : on garde celui du magasin.
        store.profile = { ...profile, countryCode: store.profile.countryCode };
      },
    },
    avatar: {
      async get() {
        return store.avatar;
      },
      async set(base64) {
        await delay();
        store.avatar = `data:image/jpeg;base64,${base64}`;
        return store.avatar;
      },
      async remove() {
        await delay();
        store.avatar = null;
      },
    },
    saved: {
      async list() {
        await delay();
        return store.saved;
      },
      async set(recipe, saved) {
        await delay();
        store.saved = saved ? [recipe, ...store.saved.filter((item) => item.id !== recipe.id)] : store.saved.filter((item) => item.id !== recipe.id);
      },
    },
    lists: {
      async overview() {
        await delay();
        return [...store.lists]
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
          .map((list) => ({
            id: list.id,
            name: list.name,
            itemCount: list.items.length,
            checkedCount: list.items.filter((item) => item.checked).length,
            updatedAt: list.updatedAt,
          }));
      },
      async detail(id) {
        await delay();
        const list = listById(id);
        return { id: list.id, name: list.name, items: [...list.items].sort((a, b) => Number(a.checked) - Number(b.checked)) };
      },
      async create(rawName) {
        await delay();
        const name = cleanName(rawName);
        if (!name) throw new ApiError("invalid_name", 400);
        if (store.lists.length >= MAX_LISTS) throw new ApiError("limit", 409);
        if (isNameTaken(store.lists.map((list) => list.name), name)) throw new ApiError("name_taken", 409);
        const id = nextDemoId(store, "liste");
        store.lists.push({ id, name, items: [], updatedAt: new Date().toISOString() });
        return id;
      },
      async rename(id, rawName) {
        await delay();
        const list = listById(id);
        const name = cleanName(rawName);
        if (!name) throw new ApiError("invalid_name", 400);
        if (isNameTaken(store.lists.map((item) => item.name), name, list.name)) throw new ApiError("name_taken", 409);
        list.name = name;
        touch(id);
      },
      async remove(id) {
        await delay();
        listById(id);
        store.lists = store.lists.filter((list) => list.id !== id);
      },
      async addItem(listId, item) {
        await delay();
        const name = cleanName(item.name, 80);
        if (name.length < 2) throw new ApiError("invalid_name", 400);
        const list = listById(listId);
        list.items = mergeDrafts(list.items, [{ ...item, name }], () => nextDemoId(store, "article"), false).items;
        touch(listId);
      },
      async addRecipe(listId, recipe, servings) {
        await delay();
        const list = listById(listId);
        const result = mergeDrafts(list.items, recipeDrafts(recipe, servings), () => nextDemoId(store, "article"), true);
        list.items = result.items;
        touch(listId);
        return { added: result.added, merged: result.merged };
      },
      async setChecked(listId, itemId, checked) {
        await delay();
        const list = listById(listId);
        list.items = list.items.map((item) => (item.id === itemId ? { ...item, checked } : item));
        touch(listId);
      },
      async removeItem(listId, itemId) {
        await delay();
        const list = listById(listId);
        list.items = list.items.filter((item) => item.id !== itemId);
        touch(listId);
      },
      async clearChecked(listId) {
        await delay();
        const list = listById(listId);
        list.items = list.items.filter((item) => !item.checked);
        touch(listId);
      },
    },
    catalog: {
      async load() {
        await delay();
        const all = Object.values(DEMO_RECIPES);
        const recipes = filterSafe(all, store.profile.allergens);
        return { recipes, hiddenCount: all.length - recipes.length };
      },
    },
  };
}