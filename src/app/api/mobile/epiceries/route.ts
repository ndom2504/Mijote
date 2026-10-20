import { z } from "zod";
import { fail, json, rateLimit, api } from "@/server/http";
import { chainsForProvince, isProvinceCode, PROVINCES } from "@/server/stores/chains";
import { inCanada, type PlaceCandidate } from "@/server/stores/rank";
import { placeFromProfile, storesNear } from "@/server/stores/service";

const ATTRIBUTION = "Données des commerces : © contributeurs OpenStreetMap (licence ODbL)";

const chosenPlace = z.object({
  lat: z.coerce.number(),
  lon: z.coerce.number(),
  province: z.string().max(2).optional(),
  label: z.string().trim().max(120).optional(),
});

function describe(place: PlaceCandidate) {
  return { ...place, provinceName: place.province ? PROVINCES[place.province] : null };
}

/**
 * Épiceries du Canada près d'un lieu.
 * - `?lat&lon&province&label` : lieu choisi par la personne (voir /api/mobile/epiceries/lieux) ;
 * - sans paramètre : lieu déduit du profil (code postal, sinon municipalité du Québec).
 */
export const GET = api(async (request, user) => {
  if (!user) return fail("unauthenticated", 401);
  if (!rateLimit(`stores:${user.id}`, 30, 60_000)) return fail("rate", 429);

  const params = new URL(request.url).searchParams;
  let place: PlaceCandidate | null = null;
  let placeUnavailable = false;

  if (params.has("lat") || params.has("lon")) {
    const parsed = chosenPlace.safeParse(Object.fromEntries(params));
    if (!parsed.success || !inCanada(parsed.data.lat, parsed.data.lon)) return fail("invalid", 400);
    const province = isProvinceCode(parsed.data.province) ? parsed.data.province : null;
    place = { label: parsed.data.label || "Lieu choisi", city: parsed.data.label?.split(",")[0] ?? "Lieu choisi", province, lat: parsed.data.lat, lon: parsed.data.lon };
  } else {
    const fromProfile = await placeFromProfile(user.id);
    if (fromProfile.country !== "CA") return json({ supported: false, needsPlace: false, place: null, stores: [], chains: [], freshness: null, radiusKm: null, attribution: ATTRIBUTION });
    place = fromProfile.place;
    placeUnavailable = fromProfile.unavailable;
  }

  if (!place) {
    return json({ supported: true, needsPlace: !placeUnavailable, placeUnavailable, place: null, stores: [], chains: [], freshness: null, radiusKm: null, attribution: ATTRIBUTION });
  }

  const nearby = await storesNear(place.lat, place.lon, place.province);
  return json({
    supported: true,
    needsPlace: false,
    placeUnavailable: false,
    place: describe(place),
    stores: nearby.stores,
    chains: chainsForProvince(place.province),
    freshness: nearby.freshness,
    radiusKm: nearby.radiusKm,
    attribution: ATTRIBUTION,
  });
}, { auth: true });
