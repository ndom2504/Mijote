import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { createMemoryDatabase, migrate, query, setDatabase } from "@/server/db/client";
import { configureRemote, type Fetcher } from "@/server/stores/remote";
import { isPostalTerm, searchCanadianPlaces, storesNear } from "@/server/stores/service";

function shop(id: number, name: string, lat: number, lon: number, type = "supermarket") {
  return { osm_type: "node", osm_id: id, lat: String(lat), lon: String(lon), name, category: "shop", type, address: { road: "Rue Principale", city: "Saguenay" }, extratags: {} };
}

function respond(body: unknown, ok = true, status = 200) {
  return Promise.resolve({ ok, status, json: async () => body });
}

describe("recherche d'épiceries (réseau simulé)", () => {
  const calls: string[] = [];

  beforeAll(async () => {
    const db = await createMemoryDatabase();
    setDatabase(db);
    await migrate(db);
  });

  afterEach(async () => {
    calls.length = 0;
    await query("DELETE FROM place_cache");
    configureRemote({ fetcher: null, spacingMs: 1100 });
  });

  function useFetcher(handler: Fetcher) {
    configureRemote({
      spacingMs: 0,
      fetcher: (url, init) => {
        calls.push(url);
        return handler(url, init);
      },
    });
  }

  it("reconnaît un code postal complet ou partiel", () => {
    expect(isPostalTerm("H2X")).toBe(true);
    expect(isPostalTerm("h2x 1y4")).toBe(true);
    expect(isPostalTerm("Saguenay")).toBe(false);
  });

  it("trouve les coordonnées d'un code postal et met la réponse en cache", async () => {
    useFetcher(() => respond({ places: [{ "place name": "Plateau Mont-Royal Southeast", latitude: "45.5148", longitude: "-73.5739", "state abbreviation": "QC" }] }));
    const first = await searchCanadianPlaces("H2X 1Y4");
    expect(first).toMatchObject({ ok: true, freshness: "live" });
    if (first.ok) expect(first.places[0]).toMatchObject({ province: "QC", lat: 45.5148 });
    const second = await searchCanadianPlaces("H2X 1Y4");
    expect(second).toMatchObject({ ok: true, freshness: "cache" });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("api.zippopotam.us/ca/H2X");
  });

  it("refuse les recherches vides ou démesurées", async () => {
    expect(await searchCanadianPlaces(" ")).toEqual({ ok: false, error: "invalid" });
    expect(await searchCanadianPlaces("x".repeat(200))).toEqual({ ok: false, error: "invalid" });
  });

  it("ne sert que des commerces d'alimentation triés, avec le cache pour les appels suivants", async () => {
    useFetcher((url) => {
      const term = new URL(url).searchParams.get("q");
      return respond(term === "supermarket" ? [shop(1, "Maxi", 48.41, -71.07), shop(2, "IGA", 48.405, -71.069), shop(3, "Metro", 48.42, -71.06), shop(4, "Super C", 48.43, -71.05)] : [shop(5, "Épicerie du coin", 48.4062, -71.0692, "grocery")]);
    });
    const live = await storesNear(48.406, -71.069, "QC");
    expect(live.freshness).toBe("live");
    expect(live.stores.length).toBe(5);
    expect(live.stores[0]?.name).toBe("IGA");
    expect(live.chains.map((chain) => chain.name)).toContain("Metro");
    const before = calls.length;
    const again = await storesNear(48.4061, -71.0691, "QC");
    expect(again.freshness).toBe("cache");
    expect(calls.length).toBe(before);
  });

  it("élargit la zone quand il y a peu de résultats", async () => {
    useFetcher((url) => {
      const viewbox = new URL(url).searchParams.get("viewbox") ?? "";
      const [left, , right] = viewbox.split(",").map(Number);
      const wide = (right! - left!) > 0.3;
      return respond(wide ? [shop(1, "Maxi", 48.5, -71), shop(2, "IGA", 48.45, -71), shop(3, "Metro", 48.4, -71.1), shop(4, "Super C", 48.35, -71.1)] : []);
    });
    const result = await storesNear(48.4, -71, "QC");
    expect(result.stores.length).toBe(4);
    expect(result.radiusKm).toBeGreaterThan(5);
  });

  it("répond sans commerce mais avec les bannières de la province quand le réseau est en panne", async () => {
    useFetcher(() => Promise.reject(new Error("réseau")));
    const result = await storesNear(48.4, -71, "QC");
    expect(result).toMatchObject({ stores: [], freshness: "unavailable" });
    expect(result.chains.length).toBeGreaterThan(0);
  });

  it("sert une entrée périmée plutôt que rien quand le réseau tombe", async () => {
    useFetcher(() => respond([shop(1, "Maxi", 48.41, -71.07), shop(2, "IGA", 48.405, -71.069), shop(3, "Metro", 48.42, -71.06), shop(4, "Super C", 48.43, -71.05)]));
    await storesNear(48.4, -71, "QC");
    await query("UPDATE place_cache SET fetched_at = $1", ["2000-01-01T00:00:00.000Z"]);
    useFetcher(() => respond({}, false, 500));
    const result = await storesNear(48.4, -71, "QC");
    expect(result.freshness).toBe("stale");
    expect(result.stores.length).toBe(4);
  });
});
