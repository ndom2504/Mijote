import { one, query } from "@/server/db/client";
import { getProfile } from "@/server/profile/service";
import { chainsForProvince, isProvinceCode, PROVINCES, provinceFromPostal, type Chain, type ProvinceCode } from "@/server/stores/chains";
import {
  inCanada,
  normalizePlaces,
  normalizeStores,
  rankStores,
  type PlaceCandidate,
  type RawPlaceResult,
  type Store,
  type StoreBase,
} from "@/server/stores/rank";
import { nominatim, postalZone, RemoteError } from "@/server/stores/remote";

const DAY = 24 * 60 * 60 * 1000;
export const PLACE_TTL_MS = 90 * DAY;
export const STORES_TTL_MS = 14 * DAY;
const MAX_STORES = 15;
const MIN_STORES = 4;

/** Demi-largeurs de recherche en degrés de latitude (≈ 5 km, 13 km, 33 km) : on élargit pour les régions peu denses. */
const SEARCH_STEPS = [0.045, 0.12, 0.3];

interface CacheEntry<T> {
  value: T;
  fetchedAt: number;
}

async function readCache<T>(key: string): Promise<CacheEntry<T> | null> {
  const row = await one<{ payload: string; fetched_at: string }>("SELECT payload, fetched_at FROM place_cache WHERE key = $1", [key]);
  if (!row) return null;
  try {
    return { value: JSON.parse(row.payload) as T, fetchedAt: Date.parse(row.fetched_at) };
  } catch {
    return null;
  }
}

async function writeCache(key: string, value: unknown): Promise<void> {
  await query(
    `INSERT INTO place_cache (key, payload, fetched_at) VALUES ($1, $2, $3)
     ON CONFLICT (key) DO UPDATE SET payload = EXCLUDED.payload, fetched_at = EXCLUDED.fetched_at`,
    [key, JSON.stringify(value), new Date().toISOString()],
  );
}

export type DataFreshness = "live" | "cache" | "stale";

interface Loaded<T> {
  value: T;
  freshness: DataFreshness;
}

/** Cache d'abord ; si le réseau échoue, une entrée périmée vaut mieux qu'aucune réponse. */
async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<Loaded<T> | null> {
  const entry = await readCache<T>(key);
  if (entry && Date.now() - entry.fetchedAt < ttlMs) return { value: entry.value, freshness: "cache" };
  try {
    const value = await load();
    await writeCache(key, value);
    return { value, freshness: "live" };
  } catch (error) {
    if (!(error instanceof RemoteError)) throw error;
    return entry ? { value: entry.value, freshness: "stale" } : null;
  }
}

const POSTAL_PATTERN = /^[A-Za-z]\d[A-Za-z]\s?(\d[A-Za-z]\d)?$/;

export function isPostalTerm(term: string): boolean {
  return POSTAL_PATTERN.test(term.trim());
}

interface ZippoPlace {
  "place name"?: string;
  latitude?: string;
  longitude?: string;
  "state abbreviation"?: string;
}

async function placesFromPostal(term: string): Promise<PlaceCandidate[]> {
  const fsa = term.replace(/\s+/g, "").slice(0, 3).toUpperCase();
  let data: unknown;
  try {
    data = await postalZone(fsa);
  } catch (error) {
    // Zone inconnue : le service répond 404. Réseau en panne : on laisse remonter l'erreur.
    if (error instanceof RemoteError && error.reason === "status") return [];
    throw error;
  }
  const places = ((data as { places?: ZippoPlace[] } | null)?.places ?? []).slice(0, 3);
  const result: PlaceCandidate[] = [];
  for (const place of places) {
    const lat = Number(place.latitude);
    const lon = Number(place.longitude);
    const abbreviation = place["state abbreviation"];
    // Certaines zones postales ont un nom à rallonge entre parenthèses (ex. le centre-ville de Toronto) : on le retire.
    const city = (place["place name"] ?? "").replace(/\s*\(.*$/, "").trim();
    if (!city || !inCanada(lat, lon)) continue;
    const province: ProvinceCode | null = isProvinceCode(abbreviation) ? abbreviation : provinceFromPostal(fsa);
    result.push({ label: `${fsa} · ${city}${province ? `, ${PROVINCES[province]}` : ""}`, city, province, lat, lon });
  }
  return result;
}

async function placesFromText(term: string): Promise<PlaceCandidate[]> {
  const raw = (await nominatim("/search", { q: term, countrycodes: "ca", addressdetails: 1, limit: 10, "accept-language": "fr" })) as RawPlaceResult[];
  return normalizePlaces(Array.isArray(raw) ? raw : [], PROVINCES).slice(0, 6);
}

export type PlaceSearch = { ok: true; places: PlaceCandidate[]; freshness: DataFreshness } | { ok: false; error: "invalid" | "unavailable" };

/** Cherche une ville, un quartier ou un code postal canadien (zone de 3 caractères ou code complet). */
export async function searchCanadianPlaces(rawTerm: string): Promise<PlaceSearch> {
  const term = rawTerm.replace(/\s+/g, " ").trim();
  if (term.length < 2 || term.length > 80) return { ok: false, error: "invalid" };
  const key = `place:v2:${term.toLowerCase()}`;
  const loaded = await cached(key, PLACE_TTL_MS, () => (isPostalTerm(term) ? placesFromPostal(term) : placesFromText(term)));
  if (!loaded) return { ok: false, error: "unavailable" };
  return { ok: true, places: loaded.value, freshness: loaded.freshness };
}

/** Lieu déduit du profil : code postal en priorité, sinon la municipalité (Québec). */
export async function placeFromProfile(userId: string): Promise<{ country: string; place: PlaceCandidate | null; unavailable: boolean }> {
  const profile = await getProfile(userId);
  const country = profile?.countryCode ?? "CA";
  if (country !== "CA" || !profile) return { country, place: null, unavailable: false };
  const terms: string[] = [];
  if (profile.postalCode) terms.push(profile.postalCode);
  if (profile.municipalityName) terms.push(`${profile.municipalityName}, ${profile.regionName ? `${profile.regionName}, ` : ""}Québec`);
  let unavailable = false;
  for (const term of terms) {
    const found = await searchCanadianPlaces(term);
    if (!found.ok) {
      unavailable = unavailable || found.error === "unavailable";
      continue;
    }
    // Une municipalité du profil est québécoise : on évite un homonyme d'une autre province.
    const place = isPostalTerm(term) ? found.places[0] : (found.places.find((candidate) => candidate.province === "QC") ?? found.places[0]);
    if (place) return { country, place, unavailable: false };
  }
  return { country, place: null, unavailable };
}

function cellKey(lat: number, lon: number, step: number): string {
  return `stores:${lat.toFixed(2)}:${lon.toFixed(2)}:${step}`;
}

async function fetchStoresInBox(lat: number, lon: number, halfLat: number): Promise<StoreBase[]> {
  const halfLon = halfLat / Math.max(0.2, Math.cos((lat * Math.PI) / 180));
  const viewbox = `${(lon - halfLon).toFixed(5)},${(lat + halfLat).toFixed(5)},${(lon + halfLon).toFixed(5)},${(lat - halfLat).toFixed(5)}`;
  const base = { bounded: 1, viewbox, addressdetails: 1, extratags: 1, limit: 40, "accept-language": "fr" };
  const [supermarkets, groceries] = await Promise.all([
    nominatim("/search", { ...base, q: "supermarket" }),
    nominatim("/search", { ...base, q: "grocery" }),
  ]);
  const asList = (value: unknown) => (Array.isArray(value) ? (value as RawPlaceResult[]) : []);
  return normalizeStores([...asList(supermarkets), ...asList(groceries)]);
}

export interface NearbyStores {
  stores: Store[];
  chains: Chain[];
  freshness: DataFreshness | "unavailable";
  radiusKm: number | null;
}

/** Épiceries autour d'un point : recherche élargie par paliers tant que les résultats sont trop rares. */
export async function storesNear(lat: number, lon: number, province: ProvinceCode | null): Promise<NearbyStores> {
  const chains = chainsForProvince(province);
  // La zone de recherche est centrée sur une cellule d'environ 1 km : deux voisins partagent le même cache.
  const centerLat = Number(lat.toFixed(2));
  const centerLon = Number(lon.toFixed(2));
  let best: Loaded<StoreBase[]> | null = null;
  let radiusKm: number | null = null;
  for (const step of SEARCH_STEPS) {
    const loaded = await cached(cellKey(centerLat, centerLon, step), STORES_TTL_MS, () => fetchStoresInBox(centerLat, centerLon, step));
    if (!loaded) break;
    best = loaded;
    radiusKm = Math.round(step * 111);
    if (loaded.value.length >= MIN_STORES) break;
  }
  if (!best) return { stores: [], chains, freshness: "unavailable", radiusKm: null };
  return { stores: rankStores(best.value, lat, lon, MAX_STORES), chains, freshness: best.freshness, radiusKm };
}
