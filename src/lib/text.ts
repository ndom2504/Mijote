export function normalizeText(value: string): string {
  return value
    .replace(/œ/g, "oe")
    .replace(/Œ/g, "OE")
    .replace(/æ/g, "ae")
    .replace(/Æ/g, "AE")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/['’]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeSearch(value: string): string {
  return normalizeText(value)
    .replace(/\bst\b/g, "saint")
    .replace(/\bste\b/g, "sainte");
}

export function compactPostal(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function formatPostal(value: string): string {
  const compact = compactPostal(value);
  if (compact.length !== 6) return value.trim().toUpperCase();
  return `${compact.slice(0, 3)} ${compact.slice(3)}`;
}

export function isPostalQuery(value: string): boolean {
  const compact = compactPostal(value);
  return /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z](?:\d[ABCEGHJ-NPRSTV-Z]\d)?$/.test(compact);
}

export function slugify(value: string): string {
  const base = normalizeText(value).replace(/\s+/g, "-").replace(/^-|-$/g, "");
  return base.slice(0, 80) || "recette";
}

export function words(value: string): string[] {
  const normalized = normalizeText(value);
  return normalized ? normalized.split(" ") : [];
}

export function mentionsTerm(haystack: string, needle: string): boolean {
  const term = normalizeText(needle);
  if (term.length < 3) return false;
  return words(haystack).includes(term) || normalizeText(haystack) === term;
}
