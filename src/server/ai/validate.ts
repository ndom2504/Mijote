import type { Allergen } from "@/lib/constants";
import { normalizeText } from "@/lib/text";
import { PLAIN_FOODS, scanIngredients } from "@/server/recipes/lexicon";

export type Substitution = {
  ingredient: string;
  replacement: string;
  noteFr: string;
  noteEn: string;
  source: "rules" | "ai";
};

const RULES: Array<Omit<Substitution, "source"> & { match: string; adds: Allergen[]; cross: Allergen[] }> = [
  {
    match: "lait",
    ingredient: "lait",
    replacement: "boisson de soya non sucrée",
    adds: ["soy"],
    cross: [],
    noteFr: "Le goût sera un peu différent. Cette boisson contient du soya.",
    noteEn: "The taste will differ slightly. This drink contains soy.",
  },
  {
    match: "lait",
    ingredient: "lait",
    replacement: "boisson d'avoine non sucrée",
    adds: [],
    cross: ["wheat_gluten"],
    noteFr: "L'avoine courante peut avoir été en contact avec le gluten.",
    noteEn: "Regular oats may have been in contact with gluten.",
  },
  {
    match: "beurre",
    ingredient: "beurre",
    replacement: "huile d'olive",
    adds: [],
    cross: [],
    noteFr: "Convient mieux à la cuisson qu'à une pâtisserie.",
    noteEn: "Better for cooking than for baking.",
  },
  {
    match: "yogourt",
    ingredient: "yogourt",
    replacement: "yogourt de soya",
    adds: ["soy"],
    cross: [],
    noteFr: "Vérifiez la liste d'ingrédients : certains yogourts de soya contiennent d'autres allergènes.",
    noteEn: "Check the label: some soy yogurts contain other allergens.",
  },
];

function blocked(adds: Allergen[], cross: Allergen[], allergens: Allergen[]): boolean {
  const banned = new Set(allergens);
  return adds.some((code) => banned.has(code)) || cross.some((code) => banned.has(code));
}

export function ruleSubstitutions(ingredientNames: string[], allergens: Allergen[]): Substitution[] {
  const found: Substitution[] = [];
  const names = ingredientNames.map((name) => normalizeText(name));
  for (const rule of RULES) {
    if (!names.some((name) => name.split(" ").includes(rule.match))) continue;
    if (blocked(rule.adds, rule.cross, allergens)) continue;
    found.push({
      ingredient: rule.ingredient,
      replacement: rule.replacement,
      noteFr: rule.noteFr,
      noteEn: rule.noteEn,
      source: "rules",
    });
  }
  return found;
}

export function validateSubstitution(replacement: string, allergens: Allergen[]): { ok: boolean; reason?: string } {
  const cleaned = replacement.trim();
  if (!cleaned || cleaned.length > 80 || cleaned.split(/\s+/).length > 6) {
    return { ok: false, reason: "format" };
  }
  const scan = scanIngredients([{ nameFr: cleaned }]);
  const banned = new Set(allergens);
  if (scan.allergens.some((code) => banned.has(code)) || scan.crossContamination.some((code) => banned.has(code))) {
    return { ok: false, reason: "allergen" };
  }
  const normalized = normalizeText(cleaned);
  const known = PLAIN_FOODS.has(normalized) || scan.allergens.length > 0 || scan.contains.legume || scan.contains.honey;
  if (!known) return { ok: false, reason: "unknown" };
  return { ok: true };
}

const FORBIDDEN_CLAIM = /garanti[e]? sans allerg|certifi[eé].{0,24}sans|gu[eé]rit|traitement m[eé]dical|prescri[tp]|diagnosti/i;

export function validateExplanation(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 20 || trimmed.length > 700) return false;
  if (FORBIDDEN_CLAIM.test(trimmed)) return false;
  return true;
}
