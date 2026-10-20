import type { NearbyStores, StoreChain, StoreKind, StorePlace, StoresFreshness } from "./types";

/** « 350 m » sous le kilomètre, « 1,2 km » ensuite, « 14 km » à partir de dix. */
export function distanceLabel(km: number): string {
  if (!Number.isFinite(km) || km < 0) return "";
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`;
  if (km < 10) return `${(Math.round(km * 10) / 10).toLocaleString("fr-CA", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
  return `${Math.round(km)} km`;
}

const KIND_LABELS: Record<StoreKind, string> = {
  supermarket: "Supermarché",
  grocery: "Épicerie",
  greengrocer: "Fruits et légumes",
  wholesale: "Grande surface",
};

export function kindLabel(kind: StoreKind): string {
  return KIND_LABELS[kind];
}

const CHAIN_LABELS: Record<StoreChain["kind"], string> = {
  supermarket: "Supermarché",
  discount: "Escompte",
  warehouse: "Club-entrepôt",
  specialty: "Spécialisé",
};

export function chainKindLabel(kind: StoreChain["kind"]): string {
  return CHAIN_LABELS[kind];
}

/** Phrase honnête sur la fraîcheur des commerces affichés ; rien si les données sont à jour. */
export function freshnessNote(freshness: StoresFreshness | null): string | null {
  if (freshness === "stale") return "Réseau indisponible : ces commerces viennent d'une recherche plus ancienne. Vérifie les détails avant de te déplacer.";
  if (freshness === "unavailable") return "La recherche de commerces est indisponible pour le moment. Voici les bannières courantes de ta province.";
  return null;
}

/** Texte « dans un rayon d'environ 5 km ». */
export function radiusNote(radiusKm: number | null): string | null {
  return radiusKm ? `Dans un rayon d'environ ${radiusKm} km.` : null;
}

/** Paramètres de requête pour un lieu choisi par la personne. */
export function placeQuery(place: StorePlace): string {
  const params = new URLSearchParams({ lat: String(place.lat), lon: String(place.lon), label: place.label });
  if (place.province) params.set("province", place.province);
  return params.toString();
}

/** Seul un lieu bien formé, au Canada, est relu depuis l'appareil (la valeur stockée n'est pas fiable). */
export function parseStoredPlace(raw: string | null): StorePlace | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<StorePlace> | null;
    if (!value || typeof value !== "object") return null;
    const { label, city, province, provinceName, lat, lon } = value;
    if (typeof label !== "string" || typeof city !== "string" || typeof lat !== "number" || typeof lon !== "number") return null;
    if (!(lat >= 41.5 && lat <= 84 && lon >= -142 && lon <= -52)) return null;
    return {
      label: label.slice(0, 120),
      city: city.slice(0, 80),
      province: typeof province === "string" ? province.slice(0, 2) : null,
      provinceName: typeof provinceName === "string" ? provinceName.slice(0, 40) : null,
      lat,
      lon,
    };
  } catch {
    return null;
  }
}

export function storesErrorMessage(code: string): string {
  if (code === "rate") return "Trop de recherches d'un coup. Patiente un instant, puis réessaie.";
  if (code === "unavailable") return "Le service de recherche de lieux est indisponible pour le moment. Réessaie dans quelques minutes.";
  if (code === "invalid") return "Écris au moins 2 caractères : une ville ou un code postal.";
  return "Impossible de joindre le serveur. Vérifie ta connexion, puis réessaie.";
}

export function hasStoreResults(result: NearbyStores | null): boolean {
  return Boolean(result && (result.stores.length > 0 || result.chains.length > 0));
}
