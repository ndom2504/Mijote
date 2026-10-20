import { fail, json, rateLimit, api } from "@/server/http";
import { PROVINCES } from "@/server/stores/chains";
import { searchCanadianPlaces } from "@/server/stores/service";

/** Recherche d'un lieu canadien (ville, quartier ou code postal) pour choisir où chercher des épiceries. */
export const GET = api(async (request, user) => {
  if (!user) return fail("unauthenticated", 401);
  if (!rateLimit(`places:${user.id}`, 30, 60_000)) return fail("rate", 429);
  const term = new URL(request.url).searchParams.get("q") ?? "";
  const result = await searchCanadianPlaces(term);
  if (!result.ok) return fail(result.error, result.error === "invalid" ? 400 : 503);
  return json({ places: result.places.map((place) => ({ ...place, provinceName: place.province ? PROVINCES[place.province] : null })) });
}, { auth: true });
