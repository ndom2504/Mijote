import { describe, expect, it } from "vitest";
import { chainKindLabel, distanceLabel, freshnessNote, kindLabel, parseStoredPlace, placeQuery, radiusNote, storesErrorMessage } from "./stores";

describe("affichage des épiceries", () => {
  it("formate les distances", () => {
    expect(distanceLabel(0.02)).toBe("50 m");
    expect(distanceLabel(0.35)).toBe("350 m");
    expect(distanceLabel(1.24)).toMatch(/^1[,.]2 km$/);
    expect(distanceLabel(14.4)).toBe("14 km");
    expect(distanceLabel(-1)).toBe("");
    expect(distanceLabel(Number.NaN)).toBe("");
  });

  it("nomme les types de commerce", () => {
    expect(kindLabel("supermarket")).toBe("Supermarché");
    expect(kindLabel("greengrocer")).toBe("Fruits et légumes");
    expect(chainKindLabel("warehouse")).toBe("Club-entrepôt");
  });

  it("signale les données anciennes ou indisponibles, mais pas les données à jour", () => {
    expect(freshnessNote("live")).toBeNull();
    expect(freshnessNote("cache")).toBeNull();
    expect(freshnessNote(null)).toBeNull();
    expect(freshnessNote("stale")).toContain("plus ancienne");
    expect(freshnessNote("unavailable")).toContain("bannières");
    expect(radiusNote(13)).toBe("Dans un rayon d'environ 13 km.");
    expect(radiusNote(null)).toBeNull();
  });

  it("encode le lieu choisi dans la requête", () => {
    const query = placeQuery({ label: "Saguenay, Québec", city: "Saguenay", province: "QC", provinceName: "Québec", lat: 48.4, lon: -71.07 });
    const params = new URLSearchParams(query);
    expect(params.get("lat")).toBe("48.4");
    expect(params.get("province")).toBe("QC");
    expect(params.get("label")).toBe("Saguenay, Québec");
  });

  it("ne relit qu'un lieu bien formé et situé au Canada", () => {
    const good = JSON.stringify({ label: "Laval, Québec", city: "Laval", province: "QC", provinceName: "Québec", lat: 45.6, lon: -73.7 });
    expect(parseStoredPlace(good)?.city).toBe("Laval");
    expect(parseStoredPlace(null)).toBeNull();
    expect(parseStoredPlace("pas du json")).toBeNull();
    expect(parseStoredPlace(JSON.stringify({ label: "Paris", city: "Paris", lat: 48.85, lon: 2.35 }))).toBeNull();
    expect(parseStoredPlace(JSON.stringify({ label: "x", city: "y", lat: "45", lon: "-73" }))).toBeNull();
  });

  it("traduit les erreurs de recherche", () => {
    expect(storesErrorMessage("rate")).toContain("Patiente");
    expect(storesErrorMessage("unavailable")).toContain("indisponible");
    expect(storesErrorMessage("invalid")).toContain("2 caractères");
    expect(storesErrorMessage("unreachable")).toContain("Vérifie ta connexion");
  });
});
