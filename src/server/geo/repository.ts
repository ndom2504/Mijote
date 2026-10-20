import { query } from "@/server/db/client";
import { filterMunicipalities, type GeoNotice, type Municipality } from "@/server/geo/search";

let cache: Municipality[] | null = null;

export function clearMunicipalityCache() {
  cache = null;
}

export async function allMunicipalities(): Promise<Municipality[]> {
  if (cache) return cache;
  const rows = await query<{
    code: string;
    name: string;
    designation: string | null;
    postal: string | null;
    region_name: string | null;
    region_code: string | null;
    mrc_name: string | null;
  }>("SELECT code, name, designation, postal, region_name, region_code, mrc_name FROM municipalities");
  cache = rows.map((row) => ({
    code: row.code,
    name: row.name,
    designation: row.designation ?? "",
    postal: row.postal ?? "",
    region: row.region_name ?? "",
    regionCode: row.region_code ?? "",
    mrc: row.mrc_name ?? "",
  }));
  return cache;
}

export async function searchPlaces(term: string): Promise<{ results: Municipality[]; notice: GeoNotice }> {
  return filterMunicipalities(await allMunicipalities(), term);
}

export async function municipalityByCode(code: string): Promise<Municipality | null> {
  const all = await allMunicipalities();
  return all.find((item) => item.code === code) ?? null;
}
