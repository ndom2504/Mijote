import { describe, expect, it } from "vitest";
import { chainsForProvince, PROVINCES, provinceFromPostal } from "@/server/stores/chains";
import { haversineKm, inCanada, normalizePlaces, normalizeStores, rankStores, safeWebsite, type RawPlaceResult } from "@/server/stores/rank";

const metro: RawPlaceResult = {
  osm_type: "node",
  osm_id: 1,
  lat: "45.5400",
  lon: "-73.5500",
  name: "Metro",
  category: "shop",
  type: "supermarket",
  address: { house_number: "4405", road: "Rue Sainte-Catherine Est", city: "Montréal" },
  extratags: { brand: "Metro", website: "https://www.metro.ca/magasins" },
};

describe("normalizeStores", () => {
  it("garde les commerces d'alimentation nommés et formate l'adresse", () => {
    const [store] = normalizeStores([metro]);
    expect(store).toMatchObject({ id: "node/1", name: "Metro", kind: "supermarket", address: "4405 Rue Sainte-Catherine Est", city: "Montréal", brand: "Metro" });
    expect(store?.website).toBe("https://www.metro.ca/magasins");
  });

  it("écarte les autres catégories, les noms vides, les coordonnées invalides et les doublons", () => {
    const stores = normalizeStores([
      metro,
      { ...metro },
      { ...metro, osm_id: 2, category: "amenity", type: "cafe" },
      { ...metro, osm_id: 3, name: "  " },
      { ...metro, osm_id: 4, lat: "abc" },
      { ...metro, osm_id: 5, type: "convenience" },
      { ...metro, osm_id: 6, type: "grocery", name: "Épicerie Chez Léa" },
    ]);
    expect(stores.map((store) => store.name)).toEqual(["Metro", "Épicerie Chez Léa"]);
  });

  it("ne garde jamais un site qui n'est pas http(s)", () => {
    expect(safeWebsite("javascript:alert(1)")).toBeNull();
    expect(safeWebsite("data:text/html,x")).toBeNull();
    expect(safeWebsite("intranet")).toBeNull();
    expect(safeWebsite("www.maxi.ca")).toBe("https://www.maxi.ca/");
    expect(safeWebsite(undefined)).toBeNull();
  });
});

describe("rankStores", () => {
  it("trie par distance et arrondit au dixième de km", () => {
    const stores = normalizeStores([
      { ...metro, osm_id: 10, name: "Loin", lat: "45.60", lon: "-73.55" },
      { ...metro, osm_id: 11, name: "Proche", lat: "45.5236", lon: "-73.5830" },
    ]);
    const ranked = rankStores(stores, 45.5236, -73.5826, 5);
    expect(ranked.map((store) => store.name)).toEqual(["Proche", "Loin"]);
    expect(ranked[0]?.distanceKm).toBeLessThan(0.1);
    expect(ranked[1]?.distanceKm).toBeGreaterThan(8);
  });

  it("limite le nombre de résultats", () => {
    const raw = Array.from({ length: 30 }, (_, index) => ({ ...metro, osm_id: 100 + index, name: `Marché ${index}`, lat: String(45.5 + index / 1000) }));
    expect(rankStores(normalizeStores(raw), 45.5, -73.55, 15)).toHaveLength(15);
  });
});

describe("géographie", () => {
  it("calcule une distance plausible (Montréal–Québec ≈ 233 km)", () => {
    expect(Math.round(haversineKm(45.5019, -73.5674, 46.8139, -71.2080))).toBeGreaterThan(225);
    expect(Math.round(haversineKm(45.5019, -73.5674, 46.8139, -71.2080))).toBeLessThan(245);
  });

  it("n'accepte que des coordonnées canadiennes", () => {
    expect(inCanada(45.5, -73.6)).toBe(true);
    expect(inCanada(48.85, 2.35)).toBe(false);
    expect(inCanada(Number.NaN, -73)).toBe(false);
  });

  it("déduit la province d'un code postal et connaît des bannières pour chacune", () => {
    expect(provinceFromPostal("H2X 1Y4")).toBe("QC");
    expect(provinceFromPostal("m5v")).toBe("ON");
    expect(provinceFromPostal("V6B")).toBe("BC");
    expect(provinceFromPostal("X0A")).toBeNull();
    for (const code of Object.keys(PROVINCES)) expect(chainsForProvince(code as keyof typeof PROVINCES).length).toBeGreaterThan(0);
    expect(chainsForProvince(null)).toEqual([]);
  });

  it("propose des lieux (pas des provinces) avec la province en toutes lettres", () => {
    const places = normalizePlaces(
      [
        { lat: "48.40", lon: "-71.07", name: "Saguenay", addresstype: "city", address: { "ISO3166-2-lvl4": "CA-QC" } },
        { lat: "50.32", lon: "-71.82", name: "Saguenay–Lac-Saint-Jean", addresstype: "state_district" },
        { lat: "48.40", lon: "-71.07", name: "Saguenay", addresstype: "city", address: { "ISO3166-2-lvl4": "CA-QC" } },
        { lat: "48.85", lon: "2.35", name: "Paris", addresstype: "city" },
      ],
      PROVINCES,
    );
    expect(places).toHaveLength(1);
    expect(places[0]).toMatchObject({ label: "Saguenay, Québec", province: "QC" });
  });
});
