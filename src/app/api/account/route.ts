import { fail, api } from "@/server/http";
import { getProfile } from "@/server/profile/service";
import { listFavorites, readPlans } from "@/server/menus/service";
import { addDays, todayInQuebec } from "@/lib/date";
import { groceryList } from "@/server/grocery/service";

export const GET = api(async (_request, user) => {
  if (!user) return fail("unauthenticated", 401);
  const profile = await getProfile(user.id);
  const today = todayInQuebec();
  const plans = await readPlans(user.id, addDays(today, -30), addDays(today, 14), profile?.locale ?? "fr");
  const favorites = await listFavorites(user.id, profile?.locale ?? "fr");
  const grocery = await groceryList(user.id, today);
  const payload = {
    profile: profile ? { ...profile } : null,
    plans: plans.map((meal) => ({ date: meal.date, slot: meal.slot, recipe: meal.recipe.name, reaction: meal.reaction })),
    favorites: favorites.map((recipe) => recipe.name),
    grocery: grocery.items.map((item) => ({ name: item.name, checked: item.checked })),
  };
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": "attachment; filename=mijote-donnees.json",
    },
  });
}, { auth: true });
