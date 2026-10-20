import { fail, json, api } from "@/server/http";
import { listFavorites } from "@/server/menus/service";
import { mobileRecipe } from "@/server/mobile/recipe";
import { getProfile } from "@/server/profile/service";

export const GET = api(async (_request, user) => {
  if (!user) return fail("unauthenticated", 401);
  const profile = await getProfile(user.id);
  if (!profile) return fail("not_found", 404);
  const recipes = await listFavorites(user.id, profile.locale);
  return json({ recipes: recipes.map(mobileRecipe) });
}, { auth: true });
