/**
 * Choix proposés dans les préférences. Les codes sont ceux du serveur (`src/lib/constants.ts`) et les libellés
 * ceux du site (`src/lib/i18n.ts`) : un test (`src/lib/options.parity.test.ts`) garde le tout aligné.
 */
export interface Option {
  code: string;
  label: string;
  /** Libellé court, pour les pastilles du tableau de bord. */
  short?: string;
}

export const ALLERGENS: readonly Option[] = [
  { code: "peanuts", label: "Arachides" },
  { code: "tree_nuts", label: "Noix" },
  { code: "milk", label: "Lait" },
  { code: "eggs", label: "Œufs" },
  { code: "wheat_gluten", label: "Blé et gluten" },
  { code: "soy", label: "Soya" },
  { code: "fish", label: "Poisson" },
  { code: "shellfish", label: "Crustacés et mollusques" },
  { code: "sesame", label: "Sésame" },
  { code: "mustard", label: "Moutarde" },
  { code: "sulphites", label: "Sulfites" },
];

export const DIETS: readonly Option[] = [
  { code: "omnivore", label: "Omnivore" },
  { code: "vegetarian", label: "Végétarien" },
  { code: "vegan", label: "Végétalien" },
  { code: "pescatarian", label: "Pescétarien" },
  { code: "no_pork", label: "Sans porc" },
  { code: "no_beef", label: "Sans bœuf" },
];

export const BREAKFAST_PREFS: readonly Option[] = [
  { code: "rapide", label: "Rapide" },
  { code: "sucre", label: "Sucré" },
  { code: "sale", label: "Salé" },
  { code: "proteines", label: "Riche en protéines" },
  { code: "vegetarien", label: "Végétarien" },
  { code: "emporter", label: "À emporter" },
];

export const LUNCH_PREFS: readonly Option[] = [
  { code: "complet", label: "Repas complet" },
  { code: "leger", label: "Léger" },
  { code: "rapide", label: "Rapide" },
  { code: "vegetarien", label: "Végétarien" },
  { code: "avance", label: "Préparable à l'avance" },
  { code: "transport", label: "Facile à transporter" },
];

export const DINNER_PREFS: readonly Option[] = [
  { code: "familial", label: "Familial" },
  { code: "economique", label: "Économique" },
  { code: "leger", label: "Léger" },
  { code: "legumes", label: "Riche en légumes" },
  { code: "proteines", label: "Riche en protéines" },
  { code: "vegetarien", label: "Végétarien" },
  { code: "rapide", label: "Rapide" },
];

export const GOALS: readonly Option[] = [
  { code: "equilibre", label: "Mieux équilibrer mon alimentation", short: "Équilibre" },
  { code: "decouverte", label: "Découvrir de nouvelles recettes", short: "Découverte" },
  { code: "budget", label: "Réduire mon budget alimentaire", short: "Budget" },
  { code: "temps", label: "Gagner du temps", short: "Gain de temps" },
  { code: "gaspillage", label: "Réduire le gaspillage", short: "Anti-gaspillage" },
  { code: "nutrition", label: "Suivre des préférences nutritionnelles particulières", short: "Nutrition" },
];

/** Temps total (préparation + cuisson) souhaité, en minutes. Le serveur accepte de 10 à 180. */
export const TIME_CHOICES = [15, 30, 45, 60, 90, 120] as const;
export const TIME_RANGE = { min: 10, max: 180 } as const;
export const SERVINGS_RANGE = { min: 1, max: 12 } as const;

export const MAX_EXCLUSIONS = 30;
export const EXCLUSION_LENGTH = { min: 3, max: 60 } as const;

export function labelOf(options: readonly Option[], code: string): string {
  return options.find((option) => option.code === code)?.label ?? code;
}

export function shortLabelOf(options: readonly Option[], code: string): string {
  const found = options.find((option) => option.code === code);
  return found?.short ?? found?.label ?? code;
}
