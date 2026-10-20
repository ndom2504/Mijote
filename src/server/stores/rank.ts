import { isProvinceCode, type ProvinceCode } from "@/server/stores/chains";

/** Résultat brut de Nominatim (format jsonv2 avec addressdetails et extratags). */
export interface RawPlaceResult {
  osm_type?: string;
  osm_id?: number | string;
  lat?: string;
  lon?: string;
  name?: string;
  category?: string;
  type?: string;
  addresstype?: string;
  display_name?: string;
  address?: Record<string, string>;
  extratags?: Record<string, string> | null;
}

export type StoreKind = "supermarket" | "grocery" | "greengrocer" | "wholesale";

/** Commerce sans distance : c'est ce qu'on garde en cache, la distance dépend de l'origine. */
export interface StoreBase {
  id: string;
  name: string;
  kind: StoreKind;
  brand: string | null;
  address: string | null;
  city: string | null;
  lat: number;
  lon: number;
  website: string | null;
}

export interface Store extends StoreBase {
  distanceKm: number;
}

const FOOD_TYPES = new Set<string>(["supermarket", "grocery", "greengrocer", "wholesale"]);

export function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const rad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLon = rad(bLon - aLon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Seules les adresses web http(s) sont gardées (jamais javascript:, data:, etc.). */
export function safeWebsite(value: string | null | undefined): string | null {
  if (!value) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(value.trim()) ? value.trim() : `https://${value.trim()}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.toString().slice(0, 300);
  } catch {
    return null;
  }
}

function clean(value: string | undefined | null, max = 120): string | null {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  return text ? text.slice(0, max) : null;
}

export function cityOf(address: Record<string, string> | undefined): string | null {
  if (!address) return null;
  return clean(address.city ?? address.town ?? address.village ?? address.municipality ?? address.hamlet ?? address.suburb);
}

/** « 4405 Rue Sainte-Catherine Est » : numéro civique d'abord, comme au Québec et en Ontario. */
export function streetAddress(address: Record<string, string> | undefined): string | null {
  if (!address) return null;
  const road = clean(address.road);
  if (!road) return null;
  const number = clean(address.house_number, 20);
  return number ? `${number} ${road}` : road;
}

export function provinceOfAddress(address: Record<string, string> | undefined): ProvinceCode | null {
  const iso = address?.["ISO3166-2-lvl4"];
  const code = typeof iso === "string" && iso.startsWith("CA-") ? iso.slice(3) : null;
  return isProvinceCode(code) ? code : null;
}

/** Garde les commerces d'alimentation nommés, sans doublon, avec des coordonnées valides. */
export function normalizeStores(raw: RawPlaceResult[]): StoreBase[] {
  const seen = new Set<string>();
  const stores: StoreBase[] = [];
  for (const item of raw) {
    if (item.category !== "shop" || !item.type || !FOOD_TYPES.has(item.type)) continue;
    const name = clean(item.name, 80);
    const lat = Number(item.lat);
    const lon = Number(item.lon);
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
    const id = item.osm_type && item.osm_id !== undefined ? `${item.osm_type}/${item.osm_id}` : `${name}@${lat.toFixed(4)},${lon.toFixed(4)}`;
    const fingerprint = `${name.toLowerCase()}@${lat.toFixed(3)},${lon.toFixed(3)}`;
    if (seen.has(id) || seen.has(fingerprint)) continue;
    seen.add(id);
    seen.add(fingerprint);
    stores.push({
      id,
      name,
      kind: item.type as StoreKind,
      brand: clean(item.extratags?.brand, 60),
      address: streetAddress(item.address),
      city: cityOf(item.address),
      lat,
      lon,
      website: safeWebsite(item.extratags?.website ?? item.extratags?.["contact:website"]),
    });
  }
  return stores;
}

/** Supermarchés d'abord à distance égale, puis tri par distance. */
export function rankStores(stores: StoreBase[], originLat: number, originLon: number, limit: number): Store[] {
  const weight: Record<StoreKind, number> = { supermarket: 0, wholesale: 0.2, greengrocer: 0.35, grocery: 0.35 };
  return stores
    .map((store) => ({ ...store, distanceKm: Math.round(haversineKm(originLat, originLon, store.lat, store.lon) * 10) / 10 }))
    .sort((a, b) => a.distanceKm + weight[a.kind] - (b.distanceKm + weight[b.kind]) || a.name.localeCompare(b.name, "fr"))
    .slice(0, limit);
}

/** Seules les coordonnées situées au Canada sont acceptées. */
export function inCanada(lat: number, lon: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= 41.5 && lat <= 84 && lon >= -142 && lon <= -52;
}

export interface PlaceCandidate {
  label: string;
  city: string;
  province: ProvinceCode | null;
  lat: number;
  lon: number;
}

const PLACE_TYPES = new Set(["city", "town", "village", "hamlet", "municipality", "suburb", "borough", "city_district", "neighbourhood", "quarter", "locality"]);

/** Lieux (villes, quartiers) proposés à partir d'une recherche de texte ; les provinces et pays sont écartés. */
export function normalizePlaces(raw: RawPlaceResult[], provinceNames: Record<string, string>): PlaceCandidate[] {
  const seen = new Set<string>();
  const places: PlaceCandidate[] = [];
  for (const item of raw) {
    if (!item.addresstype || !PLACE_TYPES.has(item.addresstype)) continue;
    const lat = Number(item.lat);
    const lon = Number(item.lon);
    if (!inCanada(lat, lon)) continue;
    const city = clean(item.name ?? cityOf(item.address), 80);
    if (!city) continue;
    const province = provinceOfAddress(item.address);
    const label = province ? `${city}, ${provinceNames[province] ?? province}` : city;
    const key = `${city.toLowerCase()}|${province}`;
    if (seen.has(key)) continue;
    seen.add(key);
    places.push({ label, city, province, lat, lon });
  }
  return places;
}
