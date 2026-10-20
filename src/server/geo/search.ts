import { compactPostal, isPostalQuery, normalizeSearch } from "@/lib/text";

export type Municipality = {
  code: string;
  name: string;
  designation: string;
  postal: string;
  region: string;
  regionCode: string;
  mrc: string;
};

export type GeoNotice = "postal_short" | "office_postal" | "none" | null;

export function filterMunicipalities(records: Municipality[], rawQuery: string): { results: Municipality[]; notice: GeoNotice } {
  const query = rawQuery.trim();
  if (query.length < 2) return { results: [], notice: null };
  if (isPostalQuery(query)) {
    const compact = compactPostal(query);
    if (compact.length < 3) return { results: [], notice: "postal_short" };
    const results = records
      .filter((record) => {
        const office = compactPostal(record.postal);
        return office === compact || office.startsWith(compact) || office.slice(0, 3) === compact.slice(0, 3);
      })
      .sort((a, b) => {
        const exactA = compactPostal(a.postal) === compact ? 0 : 1;
        const exactB = compactPostal(b.postal) === compact ? 0 : 1;
        if (exactA !== exactB) return exactA - exactB;
        return a.name.localeCompare(b.name, "fr");
      })
      .slice(0, 20);
    return { results, notice: "office_postal" };
  }

  const needle = normalizeSearch(query);
  if (needle.length < 2) return { results: [], notice: null };
  const results = records
    .map((record) => {
      const name = normalizeSearch(record.name);
      let rank = 3;
      if (name === needle) rank = 0;
      else if (name.startsWith(needle)) rank = 1;
      else if (name.includes(needle)) rank = 2;
      else return null;
      return { record, rank };
    })
    .filter((item): item is { record: Municipality; rank: number } => item != null)
    .sort((a, b) => a.rank - b.rank || a.record.name.localeCompare(b.record.name, "fr"))
    .slice(0, 20)
    .map((item) => item.record);
  return { results, notice: results.length ? null : "none" };
}
