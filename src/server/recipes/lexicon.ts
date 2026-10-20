import {
  ALLERGENS,
  EMPTY_CONTAINS,
  type Allergen,
  type Contains,
  type GroceryCategory,
} from "@/lib/constants";
import { normalizeText } from "@/lib/text";

export type ScannedIngredient = {
  nameFr: string;
  nameEn?: string;
  subIngredients?: string[];
  category?: GroceryCategory;
};

export type ScanResult = {
  allergens: Allergen[];
  contains: Contains;
  crossContamination: Allergen[];
};

const NAMED_RULES: { pattern: RegExp; allergens?: Allergen[]; flags?: (keyof Contains)[] }[] = [
  { pattern: /\b(porc|jambon|bacon|lard|cretons)\b/, flags: ["pork"] },
  { pattern: /\b(boeuf|veau)\b/, flags: ["beef"] },
  { pattern: /\b(poulet|dinde)\b/, flags: ["poultry"] },
  { pattern: /\b(saumon|thon|morue|truite|aiglefin|poisson|cabillaud)\b/, allergens: ["fish"], flags: ["fish"] },
  { pattern: /\b(crevette|crevettes|moule|moules|crabe|homard|palourde|palourdes)\b/, allergens: ["shellfish"], flags: ["shellfish"] },
  { pattern: /\b(oeuf|oeufs)\b/, allergens: ["eggs"], flags: ["egg"] },
  { pattern: /\bmayonnaise\b/, allergens: ["eggs"], flags: ["egg"] },
  { pattern: /\b(miel)\b/, flags: ["honey"] },
  { pattern: /\b(lentille|lentilles|pois chiche|pois chiches|haricot|haricots|pois casse|pois casses|pois jaune|pois jaunes|pois vert|pois verts)\b/, flags: ["legume"] },
  { pattern: /\b(tofu|edamame|tempeh)\b/, allergens: ["soy"] },
  { pattern: /\btamari\b/, allergens: ["soy"] },
  { pattern: /\b(sauce soya|sauce soja)\b/, allergens: ["soy", "wheat_gluten"] },
  { pattern: /\b(soya|soja)\b/, allergens: ["soy"] },
  { pattern: /\b(arachide|arachides)\b/, allergens: ["peanuts"] },
  { pattern: /\b(amande|amandes|noisette|noisettes|pacane|pacanes|pistache|pistaches|cajou|pignon|pignons)\b/, allergens: ["tree_nuts"] },
  { pattern: /\bnoix\b/, allergens: ["tree_nuts"] },
  { pattern: /\b(tahini|sesame)\b/, allergens: ["sesame"] },
  { pattern: /\bmoutarde\b/, allergens: ["mustard"] },
  { pattern: /\bsulfites?\b/, allergens: ["sulphites"] },
  { pattern: /\b(ble|farine|pain|pate|pates|spaghetti|macaroni|lasagne|bagel|muffin|nouille|nouilles|orge|semoule|chapelure|pita|couscous|tortilla de ble|tortillas de ble|wrap de ble)\b/, allergens: ["wheat_gluten"] },
];

function preparedText(value: string): string {
  return normalizeText(value)
    .replace(/\blait de coco\b/g, "coco")
    .replace(/\bcreme de coco\b/g, "coco")
    .replace(/\bnoix de coco\b/g, "coco")
    .replace(/\bbeurre d arachide\b/g, "arachide")
    .replace(/\bbeurre de noix\b/g, "noix")
    .replace(/\bfarine de sarrasin\b/g, "sarrasin")
    .replace(/\bfarine de mais\b/g, "mais")
    .replace(/\bfarine de riz\b/g, "riz")
    .replace(/\bfarine de pois chiche\b/g, "pois chiche")
    .replace(/\bpates de lentilles\b/g, "lentilles")
    .replace(/\bpates de pois chiches\b/g, "pois chiches");
}

function addDairy(text: string, allergens: Set<Allergen>, contains: Contains) {
  if (/\b(lait|yogourt|fromage|beurre|cheddar|parmesan|mozzarella|cottage|creme|feta|ricotta)\b/.test(text)) {
    allergens.add("milk");
    contains.dairy = true;
  }
}

export function scanIngredients(ingredients: ScannedIngredient[]): ScanResult {
  const allergens = new Set<Allergen>();
  const contains: Contains = { ...EMPTY_CONTAINS };
  let sawOats = false;
  let sawWheat = false;

  for (const ingredient of ingredients) {
    const raw = [ingredient.nameFr, ingredient.nameEn ?? "", ...(ingredient.subIngredients ?? [])].join(" ");
    const text = preparedText(raw);
    if (/\bavoine\b/.test(text)) sawOats = true;
    addDairy(text, allergens, contains);
    for (const rule of NAMED_RULES) {
      if (!rule.pattern.test(text)) continue;
      for (const allergen of rule.allergens ?? []) allergens.add(allergen);
      for (const flag of rule.flags ?? []) contains[flag] = true;
    }
    if (allergens.has("wheat_gluten")) sawWheat = true;
  }

  const cross = new Set<Allergen>();
  if (sawOats && !sawWheat && !allergens.has("wheat_gluten")) cross.add("wheat_gluten");

  return {
    allergens: ALLERGENS.filter((code) => allergens.has(code)),
    contains,
    crossContamination: [...cross],
  };
}

export function textHasAllergen(value: string, allergen: Allergen): boolean {
  const scan = scanIngredients([{ nameFr: value }]);
  return scan.allergens.includes(allergen) || scan.crossContamination.includes(allergen);
}

export const PLAIN_FOODS = new Set([
  "riz",
  "pomme de terre",
  "pommes de terre",
  "patate",
  "patate douce",
  "carotte",
  "carottes",
  "huile d olive",
  "huile olive",
  "huile de canola",
  "citron",
  "persil",
  "ail",
  "oignon",
  "oignons",
  "pomme",
  "pommes",
  "banane",
  "bananes",
  "quinoa",
  "courgette",
  "courgettes",
  "brocoli",
  "epinard",
  "epinards",
  "tomate",
  "tomates",
  "concombre",
  "chou",
  "poivron",
  "poivrons",
  "mais",
  "bleuet",
  "bleuets",
  "fraise",
  "fraises",
  "eau",
  "sel",
  "poivre",
  "sirop d erable",
  "erable",
  "cannelle",
  "paprika",
  "cumin",
  "thym",
  "laurier",
  "vinaigre",
  "bouillon de legumes",
  "courge",
  "citrouille",
  "navet",
  "panais",
  "champignon",
  "champignons",
  "pois vert",
  "pois verts",
  "laitue",
  "kale",
  "radis",
  "asperge",
  "asperges",
  "basilic",
  "menthe",
  "gingembre",
  "curcuma",
  "coriandre",
  "lime",
  "orange",
  "pamplemousse",
  "semoule de mais",
  "fecule de mais",
  "mais en grain",
  "huile",
  "sucre",
  "cassonade",
  "melasse",
  "bicarbonate",
  "poudre a pate",
  "levure",
  "chia",
  "graines de chia",
  "coco",
  "lait de coco",
  "boisson de coco",
]);
