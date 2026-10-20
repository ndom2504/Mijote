import { beforeAll, describe, expect, it } from "vitest";
import { createMemoryDatabase, migrate, setDatabase, query } from "@/server/db/client";
import { emptyDatabase, seed } from "@/server/db/seed";
import { changePassword, confirmVerification, deleteAccount, loginAccount, registerAccount, requestPasswordReset, resetPassword } from "@/server/auth/service";
import { saveProfile } from "@/server/profile/service";
import { ensureToday, listFavorites, readPlans, replaceMeal, setFavorite, setReaction, setServings, todayBoard } from "@/server/menus/service";
import { groceryList, updateGroceryItem } from "@/server/grocery/service";
import { todayInQuebec } from "@/lib/date";
import { recipeBySlug } from "@/server/recipes/repository";
import { syncReminders, saveNotificationPrefs, listNotifications } from "@/server/notifications/service";
import { validateSubstitution } from "@/server/ai/validate";

async function account(email: string) {
  const created = await registerAccount(email, "motdepasse-solide");
  if (!created.ok || !created.verificationCode) throw new Error(created.ok ? "code manquant" : created.error);
  const verified = await confirmVerification(created.userId, created.verificationCode);
  if (!verified.ok) throw new Error(verified.error);
  return created.userId;
}

describe("parcours critique", () => {
  beforeAll(async () => {
    const db = await createMemoryDatabase();
    setDatabase(db);
    await migrate(db);
    await seed();
  }, 120000);

  it("crée un compte, isole les données et planifie sans allergène incompatible", async () => {
    const alice = await account("alice@example.com");
    const bob = await account("bob@example.com");
    const city = (await query<{ code: string }>("SELECT code FROM municipalities WHERE name = 'Montréal'"))[0];
    expect(city?.code).toBeTruthy();
    await saveProfile(alice, {
      firstName: "Alice",
      municipalityCode: city?.code ?? "",
      postalCode: "H2Y 1C6",
      householdSize: 2,
      locale: "fr",
      weeklyBudgetCents: 25000,
      cookingTimeMinutes: 60,
      diets: ["omnivore"],
      customDietNotes: "sans interprétation automatique",
      allergens: ["peanuts"],
      otherExclusions: ["coriandre"],
      breakfastPrefs: ["rapide"],
      lunchPrefs: ["leger"],
      dinnerPrefs: ["familial"],
      goals: ["equilibre"],
      onboardingCompleted: true,
    });
    const hash = (await query<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = $1", [alice]))[0]?.password_hash ?? "";
    expect(hash.startsWith("$2")).toBe(true);
    expect(hash).not.toContain("motdepasse-solide");

    await ensureToday(alice);
    const meals = await readPlans(alice, todayInQuebec(), todayInQuebec(), "fr");
    expect(meals).toHaveLength(3);
    for (const meal of meals) {
      expect(meal.recipe.allergens).not.toContain("peanuts");
      expect(meal.recipe.ingredients.some((item) => item.name.toLowerCase().includes("coriandre"))).toBe(false);
    }
    const board = await todayBoard(alice, "fr");
    expect(board.profile?.municipalityName).toBe("Montréal");
    expect(board.variety.text.length).toBeGreaterThan(10);

    const first = meals[0];
    expect(await replaceMeal(alice, first.planId)).toBe(true);
    const replaced = await readPlans(alice, todayInQuebec(), todayInQuebec(), "fr");
    expect(replaced.find((meal) => meal.planId === first.planId)?.recipe.id).not.toBe(first.recipe.id);
    expect(await setReaction(alice, first.planId, "like")).toBe(true);
    const recipe = await recipeBySlug("salade-lentilles");
    expect(recipe).toBeTruthy();
    await setFavorite(alice, recipe!.id, true);
    expect(await listFavorites(alice, "fr")).toHaveLength(1);
    expect(await listFavorites(bob, "fr")).toHaveLength(0);

    await setServings(alice, first.planId, 4);
    const groceries = await groceryList(alice, todayInQuebec());
    expect(groceries.items.length).toBeGreaterThan(3);
    const firstItem = groceries.items[0];
    expect(await updateGroceryItem(bob, firstItem.id, { checked: true })).toBe(false);
    expect(await updateGroceryItem(alice, firstItem.id, { checked: true })).toBe(true);
    const again = await groceryList(alice, todayInQuebec());
    expect(again.items.find((item) => item.id === firstItem.id)?.checked).toBe(true);
    expect(await groceryList(bob, todayInQuebec())).toMatchObject({ items: [] });

    const changed = await changePassword(alice, "motdepasse-solide", "autre-mot-de-passe");
    expect(changed.ok).toBe(true);
    const bad = await loginAccount("alice@example.com", "motdepasse-solide");
    expect(bad.ok).toBe(false);
    const good = await loginAccount("alice@example.com", "autre-mot-de-passe");
    expect(good.ok).toBe(true);

    await saveNotificationPrefs(alice, { dailyEnabled: false, dailyTime: "07:30", weeklyEnabled: false, weeklyDay: 6, weeklyTime: "10:00", channel: "in_app" });
    await syncReminders(alice, "alice@example.com", new Date());
    expect(await listNotifications(alice)).toHaveLength(0);

    expect(validateSubstitution("beurre d'arachide", ["peanuts"]).ok).toBe(false);
    expect(validateSubstitution("huile d'olive", ["peanuts"]).ok).toBe(true);

    expect((await deleteAccount(alice, "mauvais")).ok).toBe(false);
    expect((await deleteAccount(alice, "autre-mot-de-passe")).ok).toBe(true);
    expect(await listFavorites(alice, "fr")).toHaveLength(0);
    const reset = await requestPasswordReset("bob@example.com");
    expect(reset.debugToken).toBeNull();
    const issued = await query<{ token_hash: string }>("SELECT token_hash FROM email_tokens WHERE user_id = $1 AND purpose = 'reset'", [bob]);
    expect(issued).toHaveLength(1);
    expect((await resetPassword("jeton-invalide", "nouveau-mot-de-passe-1")).ok).toBe(false);
  });

  it("vide les utilisateurs entre les cas", async () => {
    const db = await import("@/server/db/client").then((module) => module.getDb());
    await emptyDatabase(await db);
  });
});
