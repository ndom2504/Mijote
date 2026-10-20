import type { Recipe } from "../../domain/types";

/**
 * DONNÉES DE DÉMONSTRATION — jamais utilisées en production.
 * Elles servent uniquement lorsque l'utilisateur choisit le mode démonstration
 * (ou `EXPO_PUBLIC_DATA_SOURCE=demo`). Aucune allergie n'y est vérifiée.
 */
const UNSPLASH = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1400&q=80`;

export const DEMO_BREAKFAST: Recipe = {
  id: "demo-gruau-bleuets",
  slug: "demo-gruau-bleuets",
  name: "Gruau aux bleuets",
  description: "Un gruau crémeux, garni de bleuets et d'un filet de sirop d'érable.",
  photoUrl: UNSPLASH("photo-1517673132405-a56a62b18caf"),
  photoCredit: "Photo Unsplash (Unsplash Licence)",
  prepMinutes: 5,
  cookMinutes: 10,
  servings: 2,
  difficulty: "facile",
  costNote: "Démonstration : aucun coût affiché.",
  allergens: ["wheat_gluten"],
  mayContain: [],
  ingredients: [
    { name: "Flocons d'avoine", quantity: 1, unit: "tasse" },
    { name: "Lait", quantity: 2, unit: "tasses" },
    { name: "Bleuets", quantity: 1, unit: "tasse" },
    { name: "Sirop d'érable", quantity: 2, unit: "c. à soupe" },
  ],
  steps: [
    "Chauffer le lait à feu moyen dans une casserole.",
    "Ajouter les flocons d'avoine et cuire 8 minutes en remuant.",
    "Garnir de bleuets et de sirop d'érable.",
  ],
  origin: { code: "CA", name: "Canada" },
};

export const DEMO_LUNCH: Recipe = {
  id: "demo-salade-quinoa",
  slug: "demo-salade-quinoa",
  name: "Salade de quinoa et légumes croquants",
  description: "Une salade fraîche, prête en quelques minutes, parfaite pour le dîner.",
  photoUrl: UNSPLASH("photo-1512621776951-a57141f2eefd"),
  photoCredit: "Photo Unsplash (Unsplash Licence)",
  prepMinutes: 15,
  cookMinutes: 15,
  servings: 2,
  difficulty: "facile",
  costNote: "Démonstration : aucun coût affiché.",
  allergens: [],
  mayContain: [],
  ingredients: [
    { name: "Quinoa", quantity: 1, unit: "tasse" },
    { name: "Concombre", quantity: 1, unit: null },
    { name: "Tomates cerises", quantity: 1, unit: "tasse" },
    { name: "Citron", quantity: 1, unit: null },
    { name: "Huile d'olive", quantity: 2, unit: "c. à soupe" },
  ],
  steps: [
    "Rincer le quinoa, puis le cuire 15 minutes dans deux fois son volume d'eau.",
    "Couper le concombre et les tomates.",
    "Mélanger le tout avec le jus de citron et l'huile d'olive.",
  ],
  origin: null,
};

export const DEMO_DINNER: Recipe = {
  id: "demo-saumon-citron-quinoa",
  slug: "demo-saumon-citron-quinoa",
  name: "Saumon au citron et quinoa",
  description: "Un filet de saumon doré, servi avec du quinoa, du brocoli et des tomates.",
  photoUrl: UNSPLASH("photo-1467003909585-2f8a72700288"),
  photoCredit: "Photo Unsplash (Unsplash Licence)",
  prepMinutes: 10,
  cookMinutes: 10,
  servings: 2,
  difficulty: "facile",
  costNote: "Démonstration : aucun coût affiché.",
  allergens: ["fish"],
  mayContain: [],
  ingredients: [
    { name: "Filets de saumon", quantity: 2, unit: null },
    { name: "Quinoa cuit", quantity: 2, unit: "tasses" },
    { name: "Brocoli", quantity: 1, unit: "tasse" },
    { name: "Citron", quantity: 1, unit: null },
    { name: "Huile d'olive", quantity: 1, unit: "c. à soupe" },
  ],
  steps: [
    "Chauffer l'huile dans une poêle à feu moyen-vif.",
    "Saisir le saumon 4 minutes de chaque côté.",
    "Cuire le brocoli à la vapeur 5 minutes.",
    "Servir sur le quinoa avec le jus et les tranches de citron.",
  ],
  origin: null,
};

export const DEMO_RECIPES = { breakfast: DEMO_BREAKFAST, lunch: DEMO_LUNCH, dinner: DEMO_DINNER } as const;
