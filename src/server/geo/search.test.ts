import fs from "fs";
import { describe, expect, it } from "vitest";
import { filterMunicipalities, type Municipality } from "@/server/geo/search";
import { normalizeSearch } from "@/lib/text";

const records = JSON.parse(fs.readFileSync("data/municipalities.json", "utf8")) as Municipality[];

describe("municipalités du Québec", () => {
  it("couvre les 17 régions et les municipalités éloignées", () => {
    expect(records.length).toBeGreaterThan(1000);
    expect(new Set(records.map((item) => item.regionCode)).size).toBe(17);
    for (const name of ["Montréal", "Kuujjuaq", "Gaspé", "Les Îles-de-la-Madeleine"]) {
      expect(records.some((item) => item.name === name)).toBe(true);
    }
  });

  it("trouve une ville malgré les accents et une abréviation", () => {
    expect(filterMunicipalities(records, "Montreal").results[0]?.name).toBe("Montréal");
    const jerome = records.find((item) => normalizeSearch(item.name) === "saint jerome");
    expect(jerome?.name).toBe("Saint-Jérôme");
    expect(filterMunicipalities(records, "St-Jerome").results[0]?.code).toBe(jerome?.code);
    expect(filterMunicipalities(records, "Kuujjuaq").results[0]?.region).toBe("Nord-du-Québec");
  });

  it("recherche le code postal du siège sans prétendre couvrir toutes les adresses", () => {
    const montreal = records.find((item) => item.name === "Montréal");
    const found = filterMunicipalities(records, montreal?.postal ?? "");
    expect(found.results[0]?.name).toBe("Montréal");
    expect(found.notice).toBe("office_postal");
    expect(filterMunicipalities(records, "zzz").results).toHaveLength(0);
  });
});
