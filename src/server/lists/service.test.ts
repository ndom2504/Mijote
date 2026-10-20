import { beforeAll, describe, expect, it } from "vitest";
import { confirmVerification, registerAccount } from "@/server/auth/service";
import { createMemoryDatabase, migrate, query, setDatabase } from "@/server/db/client";
import { seed } from "@/server/db/seed";
import {
  addItem,
  addRecipeToList,
  clearChecked,
  createList,
  deleteItem,
  deleteList,
  getList,
  listSaved,
  listsOverview,
  MAX_LISTS,
  renameList,
  setItemChecked,
  setSaved,
} from "@/server/lists/service";
import { allRecipes } from "@/server/recipes/repository";

async function account(email: string): Promise<string> {
  const created = await registerAccount(email, "motdepasse-solide");
  if (!created.ok || !created.verificationCode) throw new Error("inscription");
  await confirmVerification(created.userId, created.verificationCode);
  return created.userId;
}

describe("recettes sauvegardées et listes d'épicerie", () => {
  let alice = "";
  let bob = "";
  let recipeId = "";
  let secondRecipeId = "";

  beforeAll(async () => {
    const db = await createMemoryDatabase();
    setDatabase(db);
    await migrate(db);
    await seed();
    alice = await account("alice-listes@example.com");
    bob = await account("bob-listes@example.com");
    const recipes = await allRecipes();
    recipeId = recipes[0].id;
    secondRecipeId = recipes[1].id;
  }, 120000);

  it("sauvegarde et retire une recette, sans toucher aux favoris", async () => {
    expect(await setSaved(alice, recipeId, true)).toBe(true);
    expect(await setSaved(alice, recipeId, true)).toBe(true);
    expect((await listSaved(alice, "fr")).map((recipe) => recipe.id)).toEqual([recipeId]);
    expect((await listSaved(bob, "fr")).length).toBe(0);
    const favorites = await query("SELECT * FROM favorites WHERE user_id = $1", [alice]);
    expect(favorites.length).toBe(0);
    expect(await setSaved(alice, recipeId, false)).toBe(true);
    expect((await listSaved(alice, "fr")).length).toBe(0);
  });

  it("refuse de sauvegarder une recette inconnue", async () => {
    expect(await setSaved(alice, "recette-inexistante", true)).toBe(false);
  });

  it("crée, renomme et supprime des listes, avec des noms propres et uniques", async () => {
    const created = await createList(alice, "  Souper   du   dimanche ");
    expect(created.ok).toBe(true);
    const id = created.ok ? created.id : "";
    expect((await listsOverview(alice)).map((list) => list.name)).toContain("Souper du dimanche");

    expect(await createList(alice, "souper du dimanche")).toEqual({ ok: false, error: "name_taken" });
    expect(await createList(alice, "   ")).toEqual({ ok: false, error: "invalid_name" });
    expect(await createList(bob, "Souper du dimanche")).toMatchObject({ ok: true });

    expect(await renameList(alice, id, "Fête")).toEqual({ ok: true });
    expect(await renameList(alice, id, "")).toEqual({ ok: false, error: "invalid_name" });
    expect(await deleteList(alice, id)).toBe(true);
    expect(await deleteList(alice, id)).toBe(false);
  });

  it("isole les listes entre utilisateurs", async () => {
    const created = await createList(alice, "Privée");
    const id = created.ok ? created.id : "";
    expect(await getList(bob, id)).toBeNull();
    expect(await renameList(bob, id, "Volée")).toEqual({ ok: false, error: "not_found" });
    expect(await deleteList(bob, id)).toBe(false);
    expect(await addItem(bob, id, { name: "Pommes", quantity: null, unit: null })).toEqual({ ok: false, error: "not_found" });
    const detail = await getList(alice, id);
    expect(detail?.name).toBe("Privée");
  });

  it("gère les articles : ajout, cochage, suppression, nettoyage", async () => {
    const created = await createList(alice, "Marché");
    const id = created.ok ? created.id : "";
    expect(await addItem(alice, id, { name: "Pommes", quantity: 6, unit: "unite" })).toEqual({ ok: true });
    expect(await addItem(alice, id, { name: "x", quantity: null, unit: null })).toEqual({ ok: false, error: "invalid_name" });
    await addItem(alice, id, { name: "Lait", quantity: null, unit: null });
    let detail = await getList(alice, id);
    expect(detail?.items.length).toBe(2);
    const apples = detail?.items.find((item) => item.name === "Pommes");
    const milk = detail?.items.find((item) => item.name === "Lait");

    expect(await setItemChecked(alice, apples?.id ?? "", true)).toBe(true);
    expect(await setItemChecked(bob, apples?.id ?? "", false)).toBe(false);
    detail = await getList(alice, id);
    expect(detail?.items.find((item) => item.name === "Pommes")?.checked).toBe(true);

    const summary = (await listsOverview(alice)).find((list) => list.id === id);
    expect(summary).toMatchObject({ itemCount: 2, checkedCount: 1 });

    expect(await clearChecked(alice, id)).toBe(true);
    expect((await getList(alice, id))?.items.map((item) => item.name)).toEqual(["Lait"]);
    expect(await deleteItem(bob, milk?.id ?? "")).toBe(false);
    expect(await deleteItem(alice, milk?.id ?? "")).toBe(true);
    expect((await getList(alice, id))?.items.length).toBe(0);
  });

  it("ajoute les ingrédients d'une recette, mis à l'échelle, puis fusionne un second ajout", async () => {
    const created = await createList(alice, "Recette");
    const id = created.ok ? created.id : "";
    const recipe = (await allRecipes()).find((item) => item.id === recipeId);
    const first = await addRecipeToList(alice, id, recipeId, (recipe?.servings ?? 1) * 2);
    expect(first.ok).toBe(true);
    const detail = await getList(alice, id);
    expect(detail?.items.length).toBe(recipe?.ingredients.length ?? -1);
    expect(detail?.items.every((item) => item.fromRecipe)).toBe(true);

    const scalable = recipe?.ingredients.find((item) => item.scalable && item.quantity != null);
    const doubled = detail?.items.find((item) => item.name === scalable?.nameFr);
    expect(doubled?.quantity).toBe(Math.round((scalable?.quantity ?? 0) * 2 * 100) / 100);

    const again = await addRecipeToList(alice, id, recipeId, recipe?.servings);
    expect(again.ok).toBe(true);
    expect(again.ok && again.merged).toBeGreaterThan(0);

    expect(await addRecipeToList(alice, id, "inconnue-xyz")).toEqual({ ok: false, error: "not_found" });
    expect(await addRecipeToList(bob, id, secondRecipeId)).toEqual({ ok: false, error: "not_found" });
  });

  it("limite le nombre de listes", async () => {
    const carol = await account("carol-listes@example.com");
    for (let index = 0; index < MAX_LISTS; index += 1) {
      expect(await createList(carol, `Liste ${index}`)).toMatchObject({ ok: true });
    }
    expect(await createList(carol, "Une de trop")).toEqual({ ok: false, error: "limit" });
  });

  it("supprime les listes et sauvegardes avec le compte", async () => {
    const dave = await account("dave-listes@example.com");
    await createList(dave, "À supprimer");
    await setSaved(dave, recipeId, true);
    await query("DELETE FROM users WHERE id = $1", [dave]);
    expect((await query("SELECT * FROM shopping_lists WHERE user_id = $1", [dave])).length).toBe(0);
    expect((await query("SELECT * FROM saved_recipes WHERE user_id = $1", [dave])).length).toBe(0);
  });
});
